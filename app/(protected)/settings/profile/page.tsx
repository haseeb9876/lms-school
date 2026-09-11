import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { requireAuth } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { decryptField } from "@/lib/crypto/encryption";
import { getCurrentAcademicYear } from "@/lib/queries/academics";
import { formatDate, formatDateTime, humanizeEnum } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = { title: "My Profile" };

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-fg-subtle">{label}</dt>
      <dd className="text-sm text-fg">{value}</dd>
    </div>
  );
}

export default async function ProfilePage() {
  const session = await requireAuth();
  const year = await getCurrentAcademicYear();

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.userId },
    select: {
      name: true,
      email: true,
      phone: true,
      cnic: true,
      role: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      twoFactorEnabled: true,
      teacherProfile: { select: { employeeId: true, qualification: true, joiningDate: true } },
      studentProfile: {
        select: {
          admissionNumber: true,
          rollNumber: true,
          dateOfBirth: true,
          enrollments: {
            where: year ? { academicYearId: year.id } : undefined,
            take: 1,
            select: { section: { select: { name: true, class: { select: { name: true } } } } },
          },
        },
      },
    },
  });

  // This is the signed-in person's own record, so their own CNIC is theirs
  // to see — it's still decrypted only here, never in a list query.
  let cnic = "Unavailable";
  try {
    cnic = decryptField(user.cnic);
  } catch {
    // A value encrypted under a rotated key shouldn't break the page.
  }

  const enrollment = user.studentProfile?.enrollments[0];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="My profile"
        description="Your account details as the school holds them."
        actions={
          <Link href="/settings/security">
            <Button variant="secondary" size="sm">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Security settings
            </Button>
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-line bg-surface-raised p-5 shadow-soft">
        <Avatar name={user.name} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold text-fg">{user.name}</p>
          <p className="mt-0.5 text-sm text-fg-subtle">{humanizeEnum(user.role)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {user.twoFactorEnabled ? (
            <Badge variant="success" dot>
              Two-factor on
            </Badge>
          ) : (
            <Badge variant="warning" dot>
              Two-factor off
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-line">
              <Row label="Full name" value={user.name} />
              <Row label="CNIC / B-Form" value={cnic} />
              <Row label="Email" value={user.email ?? "Not set"} />
              <Row label="Phone" value={user.phone ?? "Not set"} />
              <Row label="Account created" value={formatDate(user.createdAt)} />
              <Row
                label="Last signed in"
                value={user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "This is your first session"}
              />
            </dl>
          </CardContent>
        </Card>

        {(user.studentProfile || user.teacherProfile) && (
          <Card>
            <CardHeader>
              <CardTitle>{user.studentProfile ? "Student record" : "Staff record"}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-line">
                {user.studentProfile && (
                  <>
                    <Row label="Admission number" value={user.studentProfile.admissionNumber} />
                    <Row label="Roll number" value={user.studentProfile.rollNumber ?? "—"} />
                    <Row
                      label="Class"
                      value={
                        enrollment
                          ? `${enrollment.section.class.name} — ${enrollment.section.name}`
                          : "Not enrolled"
                      }
                    />
                    <Row
                      label="Date of birth"
                      value={
                        user.studentProfile.dateOfBirth
                          ? formatDate(user.studentProfile.dateOfBirth)
                          : "—"
                      }
                    />
                  </>
                )}
                {user.teacherProfile && (
                  <>
                    <Row label="Employee ID" value={user.teacherProfile.employeeId} />
                    <Row label="Qualification" value={user.teacherProfile.qualification ?? "—"} />
                    <Row label="Joining date" value={formatDate(user.teacherProfile.joiningDate)} />
                  </>
                )}
              </dl>
            </CardContent>
          </Card>
        )}
      </div>

      <p className="text-xs text-fg-subtle">
        Something wrong here? These details are maintained by the school office — raise a{" "}
        <Link href="/helpdesk" className="font-medium text-brand hover:underline">
          help desk ticket
        </Link>{" "}
        to have them corrected.
      </p>
    </div>
  );
}
