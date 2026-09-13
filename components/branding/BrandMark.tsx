"use client";

import { useState } from "react";
import { readableTextColor } from "@/lib/color";
import { cn } from "@/lib/cn";

/**
 * The school's logo, with the monogram as a fallback that also covers the
 * logo failing to load.
 *
 * The three places this replaces each rendered the logo when a URL existed
 * and the monogram when it did not — which quietly assumes that a stored URL
 * still resolves. It does not always. The uploaded file lives wherever the
 * storage driver put it, and the driver depends on the environment: a logo
 * uploaded on a machine with no blob token is written to the local
 * filesystem and recorded as `/api/files/branding/…`, which 404s on a
 * serverless host where that filesystem does not exist. The same thing
 * happens in reverse when a school moves from one host to another.
 *
 * The result was a broken-image icon at the top of the login screen — the
 * first thing anyone sees, including someone being shown the app for the
 * first time. A monogram is not as good as the real logo, but it is far
 * better than that, and it costs nothing to fall back to.
 *
 * A Client Component only because `onError` needs a browser. It renders the
 * image directly so the markup matches on the server; the swap happens only
 * if the load actually fails.
 */
export function BrandMark({
  logoUrl,
  schoolName,
  primaryColor,
  size = "md",
  className,
}: {
  logoUrl: string | null;
  schoolName: string;
  primaryColor: string;
  /** sm: app shell · md: auth screens · lg: welcome */
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  const box =
    size === "sm"
      ? "h-8 w-8 rounded-md text-sm"
      : size === "lg"
        ? "h-16 w-16 rounded-2xl text-2xl shadow-raised"
        : "h-14 w-14 rounded-xl text-xl shadow-soft";

  if (logoUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt=""
        aria-hidden="true"
        // Lets the launch screen reuse the logo the page has already
        // fetched, instead of triggering a second request for it.
        data-brand-mark=""
        onError={() => setFailed(true)}
        className={cn("flex-none object-cover", box, className)}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={cn("flex flex-none items-center justify-center font-bold", box, className)}
      style={{ background: primaryColor, color: readableTextColor(primaryColor) }}
    >
      {schoolName.charAt(0).toUpperCase()}
    </div>
  );
}
