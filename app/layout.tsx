import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { getBrandingSettings, brandingCssVariables } from "@/lib/branding";
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
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const branding = await getBrandingSettings();
  const brandVars = brandingCssVariables(branding) as CSSProperties;

  return (
    <html lang="en" className={jakarta.variable} style={brandVars}>
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">{children}</body>
    </html>
  );
}
