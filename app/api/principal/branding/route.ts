import { revalidateTag } from "next/cache";
import { withAuth } from "@/lib/auth/with-auth";
import { parseJsonBody } from "@/lib/validation";
import { brandingUpdateSchema } from "@/lib/schemas/branding";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { BRANDING_CACHE_TAG, SCHOOL_SETTINGS_ID } from "@/lib/branding";

export const GET = withAuth(["PRINCIPAL"], async () => {
  const settings = await prisma.schoolSettings.findUnique({ where: { id: SCHOOL_SETTINGS_ID } });
  return Response.json({ settings });
});

export const PUT = withAuth(["PRINCIPAL"], async (req, { session }) => {
  const data = await parseJsonBody(req, brandingUpdateSchema);

  const settings = await prisma.schoolSettings.upsert({
    where: { id: SCHOOL_SETTINGS_ID },
    create: {
      id: SCHOOL_SETTINGS_ID,
      schoolName: data.schoolName,
      primaryColor: data.primaryColor,
      address: data.address || null,
      phone: data.phone || null,
      email: data.email || null,
      website: data.website || null,
      updatedById: session.userId,
    },
    update: {
      schoolName: data.schoolName,
      primaryColor: data.primaryColor,
      address: data.address || null,
      phone: data.phone || null,
      email: data.email || null,
      website: data.website || null,
      updatedById: session.userId,
    },
  });

  revalidateTag(BRANDING_CACHE_TAG, "max");
  await logAudit({
    actorId: session.userId,
    action: "BRANDING_UPDATED",
    targetType: "SchoolSettings",
    targetId: SCHOOL_SETTINGS_ID,
    metadata: { schoolName: data.schoolName, primaryColor: data.primaryColor },
    req,
  });

  return Response.json({ settings });
});
