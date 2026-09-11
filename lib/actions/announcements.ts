"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { notifyUsers } from "@/lib/notifications";
import { resolveAudienceUserIds } from "@/lib/queries/announcements";
import { withAction } from "./with-action";
import { actionError, actionOk } from "./types";

const publishAnnouncementSchema = z.object({
  title: z.string().trim().min(3, "Give the announcement a title.").max(160, "Title is too long."),
  body: z.string().trim().min(10, "Write the announcement body.").max(5000, "Body is too long."),
  audience: z.enum(["ALL", "PRINCIPAL", "TEACHERS", "STUDENTS", "PARENTS", "SECTION"]),
  sectionId: z.string().optional(),
  expiresAt: z.string().optional(),
});

export const publishAnnouncement = withAction(
  { roles: ["PRINCIPAL", "TEACHER"], input: publishAnnouncementSchema },
  async (input, ctx) => {
    /*
     * A teacher can post to a class they teach, but not to the whole school
     * and not to other staff — school-wide messaging is the principal's.
     * Without this a single teacher account could notify every guardian.
     */
    if (ctx.user.role === "TEACHER") {
      if (input.audience !== "SECTION") {
        return actionError("Teachers can only post announcements to a class they teach.", {
          code: "AUDIENCE_NOT_ALLOWED",
        });
      }
      if (!input.sectionId) {
        return actionError("Choose a class to post to.", {
          code: "SECTION_REQUIRED",
          fieldErrors: { sectionId: "Choose a class." },
        });
      }

      const teaches = await prisma.teacherSubjectAssignment.findFirst({
        where: { teacherId: ctx.user.id, sectionId: input.sectionId },
        select: { id: true },
      });
      const classTeacher = await prisma.section.findFirst({
        where: { id: input.sectionId, classTeacherId: ctx.user.id },
        select: { id: true },
      });

      if (!teaches && !classTeacher) {
        return actionError("You aren't assigned to that class.", { code: "NOT_YOUR_SECTION" });
      }
    }

    if (input.audience === "SECTION" && !input.sectionId) {
      return actionError("Choose a class to post to.", {
        code: "SECTION_REQUIRED",
        fieldErrors: { sectionId: "Choose a class." },
      });
    }

    const announcement = await prisma.announcement.create({
      data: {
        title: input.title,
        body: input.body,
        authorId: ctx.user.id,
        audience: input.audience,
        sectionId: input.audience === "SECTION" ? input.sectionId : null,
        expiresAt: input.expiresAt ? new Date(`${input.expiresAt}T23:59:59.000Z`) : null,
      },
      select: { id: true },
    });

    const recipientIds = await resolveAudienceUserIds(input.audience, input.sectionId);
    await notifyUsers({
      // The author doesn't need telling about their own announcement.
      userIds: recipientIds.filter((id) => id !== ctx.user.id),
      type: "ANNOUNCEMENT",
      title: input.title,
      body: input.body.slice(0, 140),
      link: "/announcements",
    });

    await logAudit({
      actorId: ctx.user.id,
      action: "ANNOUNCEMENT_PUBLISHED",
      targetType: "Announcement",
      targetId: announcement.id,
      metadata: { audience: input.audience, recipients: recipientIds.length },
    });

    revalidatePath("/announcements");
    revalidatePath("/", "layout");

    return actionOk(
      { id: announcement.id },
      `Published to ${recipientIds.length} ${recipientIds.length === 1 ? "person" : "people"}.`
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
