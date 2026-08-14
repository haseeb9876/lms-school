import { revalidateTag } from "next/cache";
import { fileTypeFromBuffer } from "file-type";
import { withAuth } from "@/lib/auth/with-auth";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/db";
import { storage, UPLOAD_LIMITS } from "@/lib/storage";
import { logAudit } from "@/lib/audit";
import { BRANDING_CACHE_TAG, SCHOOL_SETTINGS_ID } from "@/lib/branding";

export const POST = withAuth(["PRINCIPAL"], async (req, { session }) => {
  const formData = await req.formData();
  const file = formData.get("logo");

  if (!(file instanceof File)) {
    throw new ApiError(400, "No logo file was uploaded.", "NO_FILE");
  }
  if (file.size > UPLOAD_LIMITS.logo.maxBytes) {
    throw new ApiError(400, "Logo must be smaller than 2MB.", "FILE_TOO_LARGE");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Magic-byte sniffing — never trust the declared filename/MIME type alone.
  const detected = await fileTypeFromBuffer(buffer);
  const isSvg = /^\s*<\?xml|\s*<svg/i.test(buffer.subarray(0, 256).toString("utf8"));
  const detectedMime = detected?.mime ?? (isSvg ? "image/svg+xml" : null);

  if (!detectedMime || !UPLOAD_LIMITS.logo.allowedMimeTypes.includes(detectedMime)) {
    throw new ApiError(400, "Logo must be a PNG, JPEG, WebP, or SVG image.", "INVALID_FILE_TYPE");
  }

  const existing = await prisma.schoolSettings.findUnique({ where: { id: SCHOOL_SETTINGS_ID } });

  const extension = detectedMime.split("/")[1];
  const url = await storage.save(`branding/logo-${Date.now()}.${extension}`, buffer, detectedMime);

  await prisma.schoolSettings.upsert({
    where: { id: SCHOOL_SETTINGS_ID },
    create: { id: SCHOOL_SETTINGS_ID, logoUrl: url, updatedById: session.userId },
    update: { logoUrl: url, updatedById: session.userId },
  });

  if (existing?.logoUrl) {
    await storage.delete(existing.logoUrl).catch(() => {
      // Old blob cleanup failing shouldn't block the new logo from taking effect.
    });
  }

  revalidateTag(BRANDING_CACHE_TAG, "max");
  await logAudit({
    actorId: session.userId,
    action: "BRANDING_UPDATED",
    targetType: "SchoolSettings",
    targetId: SCHOOL_SETTINGS_ID,
    metadata: { field: "logoUrl" },
    req,
  });

  return Response.json({ logoUrl: url });
});
