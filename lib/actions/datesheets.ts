"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { notifyUsers } from "@/lib/notifications";
import { resolveRecipients } from "@/lib/queries/audiences";
import { getCurrentAcademicYear } from "@/lib/queries/academics";
import { storage, uploadKey, UPLOAD_LIMITS } from "@/lib/storage";
import {
  createDatesheetSchema,
  updateDatesheetSchema,
  publishDatesheetSchema,
  datesheetIdSchema,
  type DatesheetEntryInput,
} from "@/lib/schemas/datesheets";
import { withAction } from "./with-action";
import { actionError, actionOk } from "./types";

/**
 * Examination datesheets.
 *
 * A school publishes these in whichever form it already has. Sometimes the
 * timetable exists only as a sheet of paper the exam committee drew up, and
 * the fastest honest thing to do is photograph it; sometimes it is being
 * decided in the office and typing it out gives something searchable that
 * sorts by date and prints cleanly. Both are supported, and a single
 * datesheet can carry both — a photograph of the official notice for
 * authority, and typed rows underneath it so a parent on a phone can read
 * the dates without pinch-zooming a photograph.
 */

/** Empty strings from untouched form inputs mean "not set", not "". */
function orNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * A plain calendar date, not an instant.
 *
 * Parsed at UTC midnight deliberately. An exam date is a day written on a
 * notice — "12 March" — and constructing it in the server's local zone would
 * let the same row read as the 11th or the 13th depending on where the
 * process happens to run.
 */
function toDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function entryRows(entries: DatesheetEntryInput[]) {
  return entries.map((entry, index) => ({
    subjectId: orNull(entry.subjectId),
    subjectName: entry.subjectName.trim(),
    examDate: toDate(entry.examDate),
    startTime: orNull(entry.startTime),
    endTime: orNull(entry.endTime),
    room: orNull(entry.room),
    sortOrder: index,
  }));
}

/**
 * The first day of the examinations, preferring what was typed and falling
 * back to the earliest paper. It drives the "upcoming" badge and the sort,
 * so deriving it means a datesheet built from rows doesn't need the
 * principal to restate a date the rows already contain.
 */
function resolveStartsOn(typed: string | undefined, entries: DatesheetEntryInput[]): Date | null {
  if (typed) return toDate(typed);
  const dates = entries.map((entry) => entry.examDate).filter(Boolean).sort();
  return dates.length > 0 ? toDate(dates[0]) : null;
}

export const createDatesheet = withAction(
  { roles: ["PRINCIPAL"], input: createDatesheetSchema },
  async (input, ctx) => {
    const year = await getCurrentAcademicYear();
    if (!year) {
      return actionError("Set up an academic year before publishing a datesheet.", {
        code: "NO_ACADEMIC_YEAR",
      });
    }

    const sectionId = orNull(input.sectionId);
    if (sectionId) {
      const section = await prisma.section.findFirst({
        where: { id: sectionId, academicYearId: year.id },
        select: { id: true },
      });
      if (!section) {
        return actionError("That class isn't part of the current academic year.", {
          code: "SECTION_NOT_FOUND",
          fieldErrors: { sectionId: "Choose a class from the current year." },
        });
      }
    }

    const datesheet = await prisma.examDatesheet.create({
      data: {
        title: input.title.trim(),
        academicYearId: year.id,
        termId: orNull(input.termId),
        audience: input.audience,
        sectionId,
        startsOn: resolveStartsOn(orNull(input.startsOn) ?? undefined, input.entries),
        notes: orNull(input.notes),
        createdById: ctx.user.id,
        // Created as a draft, always. Publishing notifies thousands of
        // people, and a datesheet is usually assembled over more than one
        // sitting — the two must not be the same click.
        status: "DRAFT",
        entries: { createMany: { data: entryRows(input.entries) } },
      },
      select: { id: true },
    });

    await logAudit({
      actorId: ctx.user.id,
      action: "USER_CREATED",
      targetType: "ExamDatesheet",
      targetId: datesheet.id,
      metadata: { audience: input.audience, entries: input.entries.length },
    });

    revalidatePath("/datesheets");
    return actionOk({ id: datesheet.id }, "Datesheet saved as a draft.");
  }
);

export const updateDatesheet = withAction(
  { roles: ["PRINCIPAL"], input: updateDatesheetSchema },
  async (input, ctx) => {
    const existing = await prisma.examDatesheet.findUnique({
      where: { id: input.id },
      select: { id: true, status: true },
    });
    if (!existing) return actionError("That datesheet no longer exists.", { code: "NOT_FOUND" });

    const sectionId = orNull(input.sectionId);

    await prisma.$transaction([
      // Rows are replaced wholesale rather than diffed. They have no
      // identity worth preserving — nothing references an entry — and a
      // diff here would be code that can only produce subtler bugs.
      prisma.examDatesheetEntry.deleteMany({ where: { datesheetId: input.id } }),
      prisma.examDatesheet.update({
        where: { id: input.id },
        data: {
          title: input.title.trim(),
          termId: orNull(input.termId),
          audience: input.audience,
          sectionId,
          startsOn: resolveStartsOn(orNull(input.startsOn) ?? undefined, input.entries),
          notes: orNull(input.notes),
          entries: { createMany: { data: entryRows(input.entries) } },
        },
      }),
    ]);

    await logAudit({
      actorId: ctx.user.id,
      action: "USER_UPDATED",
      targetType: "ExamDatesheet",
      targetId: input.id,
      metadata: { audience: input.audience, entries: input.entries.length },
    });

    revalidatePath("/datesheets");
    revalidatePath(`/datesheets/${input.id}`);
    return actionOk(
      { id: input.id },
      existing.status === "PUBLISHED"
        ? "Datesheet updated. It's already published, so everyone sees the change now."
        : "Draft updated."
    );
  }
);

/**
 * Attaches a photographed or scanned page.
 *
 * FormData rather than a typed object, because a File cannot cross the
 * Server Action boundary any other way — the same shape the branding
 * uploads use.
 */
export const addDatesheetPage = withAction(
  { roles: ["PRINCIPAL"] },
  async (formData: FormData, ctx) => {
    const datesheetId = String(formData.get("datesheetId") ?? "");
    const caption = String(formData.get("caption") ?? "").trim();
    const file = formData.get("file");

    if (!datesheetId) return actionError("Which datesheet is this for?", { code: "NO_TARGET" });
    if (!(file instanceof File) || file.size === 0) {
      return actionError("Choose an image of the datesheet.", {
        code: "NO_FILE",
        fieldErrors: { file: "Choose an image." },
      });
    }

    const limits = UPLOAD_LIMITS.datesheet;
    if (file.size > limits.maxBytes) {
      return actionError(
        `That image is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${limits.maxBytes / 1024 / 1024} MB — most phone cameras have a setting to reduce it.`,
        { code: "TOO_LARGE", fieldErrors: { file: "Image is too large." } }
      );
    }

    /*
     * The declared type is checked, and then the bytes are checked against
     * it. A browser will send whatever content type it infers from the
     * extension, so trusting it alone means a renamed file is stored and
     * later served as an image.
     */
    if (!(limits.allowedMimeTypes as readonly string[]).includes(file.type)) {
      return actionError("Upload a photo or scan — PNG, JPEG, WebP or AVIF.", {
        code: "BAD_TYPE",
        fieldErrors: { file: "That file type isn't supported." },
      });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const sniffed = sniffImageType(buffer);
    if (!sniffed || sniffed !== file.type) {
      return actionError("That file isn't the image type it claims to be.", {
        code: "CONTENT_MISMATCH",
        fieldErrors: { file: "This doesn't look like a valid image." },
      });
    }

    const datesheet = await prisma.examDatesheet.findUnique({
      where: { id: datesheetId },
      select: { id: true, _count: { select: { pages: true } } },
    });
    if (!datesheet) return actionError("That datesheet no longer exists.", { code: "NOT_FOUND" });

    if (datesheet._count.pages >= 20) {
      return actionError("A datesheet can hold 20 pages.", { code: "TOO_MANY_PAGES" });
    }

    const extension = sniffed.split("/")[1].replace("jpeg", "jpg");
    const storageRef = await storage.save(
      uploadKey("datesheets", extension),
      buffer,
      sniffed
    );

    const page = await prisma.examDatesheetPage.create({
      data: {
        datesheetId,
        storageRef,
        caption: caption || null,
        sortOrder: datesheet._count.pages,
      },
      select: { id: true },
    });

    await logAudit({
      actorId: ctx.user.id,
      action: "USER_UPDATED",
      targetType: "ExamDatesheet",
      targetId: datesheetId,
      metadata: { addedPage: page.id, bytes: buffer.length },
    });

    revalidatePath(`/datesheets/${datesheetId}`);
    return actionOk({ id: page.id }, "Page added.");
  }
);

export const removeDatesheetPage = withAction(
  { roles: ["PRINCIPAL"], input: datesheetIdSchema },
  async (input, ctx) => {
    const page = await prisma.examDatesheetPage.findUnique({
      where: { id: input.id },
      select: { id: true, datesheetId: true, storageRef: true },
    });
    if (!page) return actionError("That page is already gone.", { code: "NOT_FOUND" });

    await prisma.examDatesheetPage.delete({ where: { id: page.id } });

    // The row is the record; a file left behind is wasted space but a row
    // pointing at a deleted file is a broken page, so the row goes first
    // and a failure here is not worth failing the action over.
    try {
      await storage.delete(page.storageRef);
    } catch {
      /* Orphaned file; the datesheet is correct either way. */
    }

    await logAudit({
      actorId: ctx.user.id,
      action: "USER_UPDATED",
      targetType: "ExamDatesheet",
      targetId: page.datesheetId,
      metadata: { removedPage: page.id },
    });

    revalidatePath(`/datesheets/${page.datesheetId}`);
    return actionOk(undefined, "Page removed.");
  }
);

/**
 * Publishes a datesheet and tells the people it is for.
 *
 * The notification carries the dates rather than only a title. Someone
 * glancing at a phone notification should learn when the examinations start
 * without opening anything — "Mid Term examinations begin 12 March" is
 * useful on a lock screen in a way that "New datesheet published" is not.
 */
export const publishDatesheet = withAction(
  { roles: ["PRINCIPAL"], input: publishDatesheetSchema },
  async (input, ctx) => {
    const datesheet = await prisma.examDatesheet.findUnique({
      where: { id: input.id },
      select: {
        id: true,
        title: true,
        audience: true,
        sectionId: true,
        startsOn: true,
        status: true,
        _count: { select: { pages: true, entries: true } },
      },
    });
    if (!datesheet) return actionError("That datesheet no longer exists.", { code: "NOT_FOUND" });

    // An empty datesheet published to the whole school is a notification
    // thousands of people cannot act on.
    if (datesheet._count.pages === 0 && datesheet._count.entries === 0) {
      return actionError(
        "This datesheet is empty. Add the exam dates, or upload a photo of the timetable, before publishing.",
        { code: "EMPTY" }
      );
    }

    const alreadyPublished = datesheet.status === "PUBLISHED";

    await prisma.examDatesheet.update({
      where: { id: datesheet.id },
      data: {
        status: "PUBLISHED",
        // Keep the original publication date on a re-publish: this is when
        // the school announced the examinations, not when a typo was fixed.
        publishedAt: alreadyPublished ? undefined : new Date(),
      },
    });

    let notified = 0;
    if (input.notify) {
      const recipients = await resolveRecipients(datesheet.audience, datesheet.sectionId);
      notified = recipients.length;

      const when = datesheet.startsOn
        ? ` begin ${datesheet.startsOn.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            timeZone: "UTC",
          })}`
        : " have been announced";

      await notifyUsers({
        userIds: recipients,
        type: "ANNOUNCEMENT",
        title: alreadyPublished ? `Updated: ${datesheet.title}` : datesheet.title,
        body: `${datesheet.title}${when}. Tap to see the full datesheet.`,
        link: `/datesheets/${datesheet.id}`,
      });
    }

    await logAudit({
      actorId: ctx.user.id,
      action: "ANNOUNCEMENT_PUBLISHED",
      targetType: "ExamDatesheet",
      targetId: datesheet.id,
      metadata: { audience: datesheet.audience, notified, republished: alreadyPublished },
    });

    revalidatePath("/datesheets");
    revalidatePath(`/datesheets/${datesheet.id}`);
    return actionOk(
      { notified },
      input.notify
        ? `Published. ${notified} ${notified === 1 ? "person has" : "people have"} been notified.`
        : "Published quietly — nobody was notified."
    );
  }
);

export const deleteDatesheet = withAction(
  { roles: ["PRINCIPAL"], input: datesheetIdSchema },
  async (input, ctx) => {
    const datesheet = await prisma.examDatesheet.findUnique({
      where: { id: input.id },
      select: { id: true, title: true, pages: { select: { storageRef: true } } },
    });
    if (!datesheet) return actionError("That datesheet is already gone.", { code: "NOT_FOUND" });

    // Pages and entries cascade with the datesheet row.
    await prisma.examDatesheet.delete({ where: { id: datesheet.id } });

    await Promise.all(
      datesheet.pages.map(async (page) => {
        try {
          await storage.delete(page.storageRef);
        } catch {
          /* Orphaned file; the record is gone, which is what was asked. */
        }
      })
    );

    await logAudit({
      actorId: ctx.user.id,
      action: "USER_UPDATED",
      targetType: "ExamDatesheet",
      targetId: datesheet.id,
      metadata: { deleted: true, title: datesheet.title },
    });

    revalidatePath("/datesheets");
    return actionOk(undefined, "Datesheet deleted.");
  }
);

/**
 * The image format, read from the bytes rather than from what the upload
 * claimed. Each of these is a fixed signature at a known offset.
 */
function sniffImageType(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") {
    return "image/webp";
  }
  // AVIF is an ISO-BMFF container: a "ftyp" box whose brand is "avif".
  if (buffer.subarray(4, 8).toString("ascii") === "ftyp" && buffer.subarray(8, 12).toString("ascii").startsWith("avi")) {
    return "image/avif";
  }

  return null;
}
