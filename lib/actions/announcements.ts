"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { notifyUsers } from "@/lib/notifications";
import { audienceNeedsSection, resolveRecipients } from "@/lib/queries/audiences";
import { withAction } from "./with-action";
import { actionError, actionOk } from "./types";

const publishAnnouncementSchema = z.object({
  title: z.string().trim().min(3, "Give the announcement a title.").max(160, "Title is too long."),
  body: z.string().trim().min(10, "Write the announcement body.").max(5000, "Body is too long."),
  audience: z.enum([
    "ALL",
    "PRINCIPAL",
    "TEACHERS",
    "STUDENTS",
    "PARENTS",
    "SECTION",
    "STUDENTS_AND_TEACHERS",
    "SECTION_WITH_GUARDIANS",
    "SECTION_TEACHERS",
  ]),
  sectionId: z.string().optional(),
  expiresAt: z.string().optional(),
});

/** The audiences a teacher may address — a class they teach, nothing wider. */
const TEACHER_ALLOWED = new Set(["SECTION", "SECTION_WITH_GUARDIANS"]);

export const publishAnnouncement = withAction(
  { roles: ["PRINCIPAL", "TEACHER"], input: publishAnnouncementSchema },
  async (input, ctx) => {
    const needsSection = audienceNeedsSection(input.audience);

    if (needsSection && !input.sectionId) {
      return actionError("Choose a class to post to.", {
        code: "SECTION_REQUIRED",
        fieldErrors: { sectionId: "Choose a class." },
      });
    }

    /*
     * A teacher can post to a class they teach, but not to the whole school
     * and not to other staff. Without this a single teacher account could
     * notify every guardian in the school.
     */
    if (ctx.user.role === "TEACHER") {
      if (!TEACHER_ALLOWED.has(input.audience)) {
        return actionError("Teachers can only post to a class they teach.", {
          code: "AUDIENCE_NOT_ALLOWED",
        });
      }

      const teaches = await prisma.section.findFirst({
        where: {
          id: input.sectionId!,
          OR: [
            { teacherAssignments: { some: { teacherId: ctx.user.id } } },
            { classTeacherId: ctx.user.id },
          ],
        },
        select: { id: true },
      });
      if (!teaches) {
        return actionError("You aren't assigned to that class.", { code: "NOT_YOUR_SECTION" });
      }
    }

    const recipientIds = await resolveRecipients(
      input.audience,
      needsSection ? input.sectionId : null
    );

    if (recipientIds.length === 0) {
      return actionError("That audience has nobody in it yet.", { code: "EMPTY_AUDIENCE" });
    }

    const announcement = await prisma.announcement.create({
      data: {
        title: input.title,
        body: input.body,
        authorId: ctx.user.id,
        audience: input.audience,
        sectionId: needsSection ? input.sectionId : null,
        expiresAt: input.expiresAt ? new Date(`${input.expiresAt}T23:59:59.000Z`) : null,
      },
      select: { id: true },
    });

    await notifyUsers({
      // The author doesn't need telling about their own announcement.
      userIds: recipientIds.filter((id) => id !== ctx.user.id),
      type: "ANNOUNCEMENT",
      title: input.title,
      // A short extract, so the alert itself says what it is about rather
      // than just "new announcement".
      body: input.body.length > 140 ? `${input.body.slice(0, 137)}…` : input.body,
      link: "/announcements",
    });

    await logAudit({
      actorId: ctx.user.id,
      action: "ANNOUNCEMENT_PUBLISHED",
      targetType: "Announcement",
      targetId: announcement.id,
      metadata: {
        audience: input.audience,
        sectionId: input.sectionId ?? null,
        recipients: recipientIds.length,
      },
    });

    revalidatePath("/announcements");
    revalidatePath("/dashboard");

    const reached = recipientIds.filter((id) => id !== ctx.user.id).length;
    return actionOk(
      { id: announcement.id, recipients: reached },
      `Published — ${reached} ${reached === 1 ? "person" : "people"} notified.`
    );
  }
);

export const deleteAnnouncement = withAction(
  { roles: ["PRINCIPAL"], input: z.object({ id: z.string().min(1) }) },
  async (input, ctx) => {
    await prisma.announcement.delete({ where: { id: input.id } });

    await logAudit({
      actorId: ctx.user.id,
      action: "ANNOUNCEMENT_PUBLISHED",
      targetType: "Announcement",
      targetId: input.id,
      metadata: { deleted: true },
    });

    revalidatePath("/announcements");
    return actionOk(undefined, "Announcement removed.");
  }
);
