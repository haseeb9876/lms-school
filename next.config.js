/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";

// Content-Security-Policy is set per-request in proxy.ts instead of here —
// it needs a fresh nonce on every request so Next.js's own inline
// hydration scripts are allowed to run without a blanket 'unsafe-inline'.
const nextConfig = {
  reactStrictMode: true,

  experimental: {
    serverActions: {
      /*
       * Uploads arrive through Server Actions, and the framework default is
       * 1MB — below a single photograph from any modern phone, which is why
       * logo and datesheet uploads were failing outright.
       *
       * 4MB rather than something larger on purpose: Vercel's serverless
       * functions reject request bodies over 4.5MB no matter what is
       * configured here, so a higher number would only move the failure from
       * our error message to the platform's. Images are downscaled in the
       * browser before they are sent (lib/image-compress.ts), so real
       * uploads land far below this — it is headroom, not the target.
       */
      bodySizeLimit: "4mb",
    },

    /*
     * Client-side navigation cache.
     *
     * `dynamic` defaults to 0, meaning every page in this app — all of them
     * are dynamic — is refetched from the server on every navigation, even
     * when returning to a page opened seconds ago. With the database far
     * enough away that a query costs ~250ms, that made Dashboard → Students
     * → Dashboard pay full price three times for two distinct pages.
     *
     * 30 seconds is short enough that a register marked in another tab shows
     * up almost immediately, and long enough that moving around the app
     * feels instant. Anything that *must* be fresh after a write already
     * calls revalidatePath, which evicts this cache regardless.
     */
    staleTimes: {
      dynamic: 30,
      static: 180,
    },

    // Recharts exports a very large surface; without this every page that
    // pulls in one chart drags the whole library into its bundle.
    optimizePackageImports: ["recharts"],
  },

  async headers() {
    return [
      {
        /*
         * The manifest carries the school's name and its icon URLs, so an
         * installed app only picks up a rename or a new logo when it re-reads
         * this. Cached, it would keep serving the old name for as long as the
         * cache lived — which on a phone can be a very long time.
         */
        source: "/manifest.webmanifest",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
      {
        // Never let a worker script go stale; it is what would update
        // everything else.
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          ...(isProd
            ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
            : []),
        ],
      },
    ];
  },
};

module.exports = nextConfig;
