import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { THEME_COOKIE, parseTheme, themeClass } from "@/components/theme/constants";
import type { CSSProperties, ReactNode } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { getBrandingSettings, brandingCssVariables } from "@/lib/branding";
import { InstallApp } from "@/components/pwa/InstallApp";
import { SplashScreen } from "@/components/branding/SplashScreen";
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
    icons: {
      icon: branding.faviconUrl ?? undefined,
      // iOS ignores the manifest for the home-screen icon and uses this.
      apple: `/app-icon?size=192&v=${branding.version}`,
    },
    applicationName: branding.schoolName,
    appleWebApp: {
      // Removes Safari's chrome once added to the home screen, which is what
      // makes it feel like an app rather than a bookmark.
      capable: true,
      title: branding.schoolName,
      statusBarStyle: "default",
    },
    // Phone numbers in addresses are already links where they should be;
    // letting iOS guess turns admission numbers into phone links.
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  /*
   * Lets the page use the full screen on a notched phone, which is what
   * makes the env(safe-area-inset-*) padding already used by the tab bar,
   * the install prompt and the launch screen actually resolve to anything.
   */
  viewportFit: "cover",
  // The app is used one-handed on phones; locking zoom would fail WCAG and
  // make small type in tables unreadable for anyone who needs to zoom in.
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf8" },
    { media: "(prefers-color-scheme: dark)", color: "#141311" },
  ],
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [branding, cookieStore] = await Promise.all([getBrandingSettings(), cookies()]);
  const brandVars = brandingCssVariables(branding) as CSSProperties;

  /*
   * The theme class is rendered here rather than applied by a script before
   * paint. React owns className on <html>, so a class added by a script was
   * reconciled away during hydration — which meant the theme silently reset
   * on every load, for light and dark alike. Rendering it server-side means
   * the markup already matches, so there is nothing to strip and no flash.
   */
  const theme = parseTheme(cookieStore.get(THEME_COOKIE)?.value);

  return (
    <html
      lang="en"
      className={[jakarta.variable, themeClass(theme)].filter(Boolean).join(" ")}
      style={brandVars}
    >
      <body className="min-h-dvh bg-surface-sunken text-fg antialiased">
        {/* Painted with the first frame and removed once the app is ready.
            In the root layout because that renders once per document load —
            a lower layout is re-rendered on client navigation, where an
            inline script would never execute. */}
        <SplashScreen />
        {children}
        {/* Registers the service worker and offers installation. Renders
            nothing at all once installed, or after being dismissed. */}
        <InstallApp />
      </body>
    </html>
  );
}
