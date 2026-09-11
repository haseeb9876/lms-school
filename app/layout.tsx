import type { Metadata, Viewport } from "next";
import type { CSSProperties, ReactNode } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { getBrandingSettings, brandingCssVariables } from "@/lib/branding";
import { ThemeScript } from "@/components/theme/ThemeScript";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBrandingSettings();
  return {
    title: { default: branding.schoolName, template: `%s · ${branding.schoolName}` },
    description: `${branding.schoolName} — student information and learning management system.`,
    icons: branding.faviconUrl ? { icon: branding.faviconUrl } : undefined,
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // The app is used one-handed on phones; locking zoom would fail WCAG and
  // make small type in tables unreadable for anyone who needs to zoom in.
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf8" },
    { media: "(prefers-color-scheme: dark)", color: "#141311" },
  ],
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const branding = await getBrandingSettings();
  const brandVars = brandingCssVariables(branding) as CSSProperties;

  return (
    <html lang="en" className={jakarta.variable} style={brandVars} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-dvh bg-surface-sunken text-fg antialiased">{children}</body>
    </html>
  );
}
