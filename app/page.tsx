import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { ArrowRight, GraduationCap, LockKeyhole, ShieldCheck } from "lucide-react";
import { getBrandingSettings } from "@/lib/branding";
import { getCurrentSession } from "@/lib/auth/current-user";
import { RETURNING_COOKIE } from "@/lib/auth/cookies";
import { quoteForSeed } from "@/lib/quotes";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { WelcomeStage } from "@/components/welcome/WelcomeStage";
import { BrandMark } from "@/components/branding/BrandMark";

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBrandingSettings();
  return {
    title: `Welcome — ${branding.schoolName}`,
    description:
      branding.tagline ??
      `${branding.schoolName} — the school portal for students, guardians and staff.`,
  };
}

/**
 * Reads cookies, so it renders per request. That is also what makes the
 * quote genuinely vary: a cached page would show every visitor the same one.
 */
export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const [branding, store, session] = await Promise.all([
    getBrandingSettings(),
    cookies(),
    getCurrentSession(),
  ]);

  /*
   * Three states, not two. Someone with a live session goes straight in;
   * someone who has signed in on this device before is greeted as a
   * returning user even though their session has expired; everyone else is
   * asked to sign in.
   */
  const signedIn = Boolean(session);
  const returning = signedIn || store.get(RETURNING_COOKIE)?.value === "1";

  // Chosen server-side and rendered once — picking on the client would
  // disagree with the server's HTML and React would swap the text out.
  const quote = quoteForSeed(Math.floor(Math.random() * 2 ** 31));

  const mark = (
    <BrandMark
      logoUrl={branding.logoUrl}
      schoolName={branding.schoolName}
      primaryColor={branding.primaryColor}
      size="lg"
    />
  );

  return (
    <>
      <WelcomeStage schoolName={branding.schoolName} mark={mark} />

      <main className="relative flex min-h-dvh flex-col">
        {/* Backdrop: the principal's photograph when there is one, a brand
            wash when there isn't — never a broken or empty hero. */}
        <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
          {branding.buildingImageUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={branding.buildingImageUrl}
                alt=""
                className="h-full w-full scale-105 object-cover"
              />
              {/* Two scrims: a vertical one so text at the bottom stays
                  readable, and a brand tint that ties any photograph to the
                  school's colour. */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-black/75" />
              <div
                className="absolute inset-0 opacity-25 mix-blend-multiply"
                style={{ background: branding.primaryColor }}
              />
            </>
          ) : (
            <div className="absolute inset-0 bg-surface-sunken">
              <div
                className="absolute inset-0 opacity-[0.12]"
                style={{
                  backgroundImage: `radial-gradient(circle at 20% 20%, ${branding.primaryColor} 0%, transparent 45%), radial-gradient(circle at 80% 70%, ${branding.primaryColor} 0%, transparent 40%)`,
                }}
              />
            </div>
          )}
        </div>

        {/* When a photo is behind it, everything sits on dark and needs light
            text regardless of the viewer's theme. */}
        <div className={branding.buildingImageUrl ? "text-white" : "text-fg"}>
          <header className="flex items-center justify-between gap-3 p-5">
            <span className="text-sm font-semibold">{branding.schoolName}</span>
            {!branding.buildingImageUrl && <ThemeToggle />}
          </header>

          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center gap-8 px-5 pb-16 pt-6 text-center sm:pt-12">
            <div className="animate-slide-up">{mark}</div>

            <div className="flex animate-slide-up flex-col items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Welcome to {branding.schoolName}
              </h1>
              {branding.tagline && (
                <p
                  className={
                    branding.buildingImageUrl ? "max-w-xl text-white/80" : "max-w-xl text-fg-muted"
                  }
                >
                  {branding.tagline}
                </p>
              )}
            </div>

            <figure
              className={[
                "w-full animate-slide-up rounded-2xl border p-6 backdrop-blur-md sm:p-8",
                branding.buildingImageUrl
                  ? "border-white/15 bg-white/10"
                  : "border-line bg-surface-raised/80 shadow-soft",
              ].join(" ")}
            >
              <blockquote className="text-balance text-lg font-medium leading-relaxed sm:text-xl">
                “{quote.text}”
              </blockquote>
              <figcaption
                className={[
                  "mt-4 text-sm",
                  branding.buildingImageUrl ? "text-white/70" : "text-fg-subtle",
                ].join(" ")}
              >
                — {quote.author}
              </figcaption>
            </figure>

            <div className="flex animate-slide-up flex-col items-center gap-3">
              {returning ? (
                <Link
                  href={signedIn ? "/dashboard" : "/login"}
                  className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand px-7 text-base font-semibold text-brand-fg shadow-raised transition-all hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  Access portal
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand px-7 text-base font-semibold text-brand-fg shadow-raised transition-all hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                  Sign in
                </Link>
              )}

              <p
                className={[
                  "text-xs",
                  branding.buildingImageUrl ? "text-white/70" : "text-fg-subtle",
                ].join(" ")}
              >
                {returning
                  ? signedIn
                    ? "You're already signed in on this device."
                    : "Welcome back — sign in to continue."
                  : "Use the CNIC and password issued by the school office."}
              </p>
            </div>

            <ul
              className={[
                "mt-2 grid w-full animate-slide-up gap-3 text-left sm:grid-cols-3",
                branding.buildingImageUrl ? "text-white/85" : "text-fg-muted",
              ].join(" ")}
            >
              {[
                {
                  icon: ShieldCheck,
                  title: "Private by design",
                  body: "Identity documents are encrypted, and every record view is logged.",
                },
                {
                  icon: LockKeyhole,
                  title: "Your data, your role",
                  body: "You only ever see the students and records the school has assigned to you.",
                },
                {
                  icon: GraduationCap,
                  title: "One place for everything",
                  body: "Attendance, results, fees and notices — for the whole school community.",
                },
              ].map((item) => (
                <li
                  key={item.title}
                  className={[
                    "rounded-xl border p-4",
                    branding.buildingImageUrl
                      ? "border-white/12 bg-white/5"
                      : "border-line bg-surface-raised/70",
                  ].join(" ")}
                >
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                  <p className="mt-2 text-sm font-semibold">{item.title}</p>
                  <p className="mt-1 text-xs leading-relaxed opacity-80">{item.body}</p>
                </li>
              ))}
            </ul>
          </div>

          <footer
            className={[
              "mt-auto px-5 pb-8 text-center text-xs",
              branding.buildingImageUrl ? "text-white/60" : "text-fg-subtle",
            ].join(" ")}
          >
            {[branding.address, branding.phone].filter(Boolean).join(" · ")}
            {branding.website && (
              <>
                {" · "}
                <a href={branding.website} className="underline underline-offset-2">
                  {branding.website.replace(/^https?:\/\//, "")}
                </a>
              </>
            )}
          </footer>
        </div>
      </main>
    </>
  );
}
