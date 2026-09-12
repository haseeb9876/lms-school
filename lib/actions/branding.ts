"use server";

import { z } from "zod";
import { revalidateTag, revalidatePath } from "next/cache";
import { fileTypeFromBuffer } from "file-type";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { storage, uploadKey, UPLOAD_LIMITS } from "@/lib/storage";
import { BRANDING_CACHE_TAG, SCHOOL_SETTINGS_ID } from "@/lib/branding";
import { brandingUpdateSchema } from "@/lib/schemas/branding";
import { withAction } from "./with-action";
import { actionError, actionOk } from "./types";

function refreshBranding() {
  // Branding is cached by tag and read by the root layout, so it has to be
  // invalidated everywhere rather than on one path.
  revalidateTag(BRANDING_CACHE_TAG, "max");
  revalidatePath("/", "layout");
}

export const updateBranding = withAction(
  { roles: ["PRINCIPAL"], input: brandingUpdateSchema },
  async (input, ctx) => {
    await prisma.schoolSettings.upsert({
      where: { id: SCHOOL_SETTINGS_ID },
      create: {
        id: SCHOOL_SETTINGS_ID,
        schoolName: input.schoolName,
        primaryColor: input.primaryColor,
        tagline: input.tagline || null,
        address: input.address || null,
        phone: input.phone || null,
        email: input.email || null,
        website: input.website || null,
        updatedById: ctx.user.id,
      },
      update: {
        schoolName: input.schoolName,
        primaryColor: input.primaryColor,
        tagline: input.tagline || null,
        address: input.address || null,
        phone: input.phone || null,
        email: input.email || null,
        website: input.website || null,
        updatedById: ctx.user.id,
      },
    });

    await logAudit({
      actorId: ctx.user.id,
      action: "BRANDING_UPDATED",
      targetType: "SchoolSettings",
      targetId: SCHOOL_SETTINGS_ID,
      metadata: { fields: ["schoolName", "primaryColor", "tagline", "contact"] },
    });

    refreshBranding();
    return actionOk(undefined, "Saved. Your changes are live across the app.");
  }
);

const imageKindSchema = z.enum(["logo", "buildingImage"]);

/**
 * Uploads a branding image.
 *
 * Takes FormData rather than a typed object because a file can't cross the
 * Server Action boundary any other way; the parts are validated by hand
 * here instead of by a schema.
 */
export const uploadBrandingImage = withAction(
  { roles: ["PRINCIPAL"] },
  async (formData: FormData, ctx) => {
    const kindResult = imageKindSchema.safeParse(formData.get("kind"));
    if (!kindResult.success) {
      return actionError("Unknown image type.", { code: "BAD_KIND" });
    }
    const kind = kindResult.data;

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return actionError("Choose an image to upload.", { code: "NO_FILE" });
    }

    const limits = kind === "logo" ? UPLOAD_LIMITS.logo : UPLOAD_LIMITS.photo;
    if (file.size > limits.maxBytes) {
      const mb = Math.round(limits.maxBytes / (1024 * 1024));
      return actionError(`That image is larger than ${mb}MB.`, { code: "FILE_TOO_LARGE" });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    /*
     * Magic-byte sniffing rather than trusting the declared MIME type or the
     * filename — either can claim to be a PNG while carrying something else.
     * SVG has no magic bytes, so it's matched on its opening markup and only
     * accepted where an SVG makes sense (a logo, never a photograph).
     */
    const detected = await fileTypeFromBuffer(buffer);
    const looksLikeSvg = /^\s*(<\?xml|<svg)/i.test(buffer.subarray(0, 256).toString("utf8"));
    const mime = detected?.mime ?? (looksLikeSvg ? "image/svg+xml" : null);

    if (!mime || !(limits.allowedMimeTypes as readonly string[]).includes(mime)) {
      return actionError(
        kind === "logo"
          ? "The logo must be a PNG, JPEG, WebP or SVG image."
          : "The photo must be a PNG, JPEG, WebP or AVIF image.",
        { code: "INVALID_FILE_TYPE" }
      );
    }

    const existing = await prisma.schoolSettings.findUnique({
      where: { id: SCHOOL_SETTINGS_ID },
      select: { logoUrl: true, buildingImageUrl: true },
    });

    const extension = mime === "image/svg+xml" ? "svg" : mime.split("/")[1];
    const url = await storage.save(uploadKey("branding", extension), buffer, mime);

    await prisma.schoolSettings.upsert({
      where: { id: SCHOOL_SETTINGS_ID },
      create: { id: SCHOOL_SETTINGS_ID, [kind === "logo" ? "logoUrl" : "buildingImageUrl"]: url, updatedById: ctx.user.id },
      update: { [kind === "logo" ? "logoUrl" : "buildingImageUrl"]: url, updatedById: ctx.user.id },
    });

    const previous = kind === "logo" ? existing?.logoUrl : existing?.buildingImageUrl;
    if (previous) {
      // Cleaning up the old file must never block the new one taking effect.
      await storage.delete(previous).catch(() => {});
    }

    await logAudit({
      actorId: ctx.user.id,
      action: "BRANDING_UPDATED",
      targetType: "SchoolSettings",
      targetId: SCHOOL_SETTINGS_ID,
      metadata: { field: kind, contentType: mime, bytes: buffer.byteLength },
    });

    refreshBranding();
    return actionOk({ url }, kind === "logo" ? "Logo updated." : "Photo updated.");
  }
);

export const removeBrandingImage = withAction(
  { roles: ["PRINCIPAL"], input: z.object({ kind: imageKindSchema }) },
  async (input, ctx) => {
    const field = input.kind === "logo" ? "logoUrl" : "buildingImageUrl";
    const existing = await prisma.schoolSettings.findUnique({
      where: { id: SCHOOL_SETTINGS_ID },
      select: { logoUrl: true, buildingImageUrl: true },
    });

    const current = input.kind === "logo" ? existing?.logoUrl : existing?.buildingImageUrl;
    if (!current) return actionOk(undefined, "Nothing to remove.");

    await prisma.schoolSettings.update({
      where: { id: SCHOOL_SETTINGS_ID },
      data: { [field]: null, updatedById: ctx.user.id },
    });
    await storage.delete(current).catch(() => {});

    await logAudit({
      actorId: ctx.user.id,
      action: "BRANDING_UPDATED",
      targetType: "SchoolSettings",
      targetId: SCHOOL_SETTINGS_ID,
      metadata: { field: input.kind, removed: true },
    });

    refreshBranding();
    return actionOk(undefined, "Removed.");
  }
);
