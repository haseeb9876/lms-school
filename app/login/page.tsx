import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/current-user";
import { getBrandingSettings } from "@/lib/branding";
import { LoginForm } from "@/components/auth/LoginForm";
import { readableTextColor } from "@/lib/color";

export default async function LoginPage() {
  const session = await getCurrentSession();
  if (session) redirect("/");

  const branding = await getBrandingSettings();

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={branding.logoUrl}
              alt={branding.schoolName}
              className="h-14 w-14 rounded-xl object-cover shadow-soft"
            />
          ) : (
            <div
              className="flex h-14 w-14 items-center justify-center rounded-xl text-xl font-bold shadow-soft"
              style={{ background: branding.primaryColor, color: readableTextColor(branding.primaryColor) }}
            >
              {branding.schoolName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-xl font-semibold text-neutral-900">{branding.schoolName}</h1>
            <p className="text-sm text-neutral-500">Sign in to your account</p>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-soft">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
