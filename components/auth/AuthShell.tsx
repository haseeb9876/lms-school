import Link from "next/link";
import type { ReactNode } from "react";
import { getBrandingSettings } from "@/lib/branding";
import { readableTextColor } from "@/lib/color";

/**
 * The frame shared by every signed-out screen — sign in, forgot password,
 * reset password. Branding is read once here rather than repeated in each
 * page, so a school's logo and colour reach all of them together.
 */
export async function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const branding = await getBrandingSettings();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-surface-sunken px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Link href="/" aria-label={`${branding.schoolName} home`}>
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={branding.logoUrl}
                alt=""
                aria-hidden="true"
                className="h-14 w-14 rounded-xl object-cover shadow-soft"
              />
            ) : (
              <div
                aria-hidden="true"
                className="flex h-14 w-14 items-center justify-center rounded-xl text-xl font-bold shadow-soft"
                style={{
                  background: branding.primaryColor,
                  color: readableTextColor(branding.primaryColor),
                }}
              >
                {branding.schoolName.charAt(0).toUpperCase()}
              </div>
            )}
          </Link>

          <div>
            <h1 className="text-xl font-semibold text-fg">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-fg-subtle">{subtitle}</p>}
          </div>
        </div>

        <div className="rounded-lg border border-line bg-surface-raised p-6 shadow-soft">{children}</div>

        {footer && <div className="mt-5 text-center text-sm text-fg-subtle">{footer}</div>}

        <p className="mt-6 text-center text-xs text-fg-subtle">{branding.schoolName}</p>
      </div>
    </div>
  );
}
