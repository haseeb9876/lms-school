/*
 * Service worker.
 *
 * Its job here is narrow on purpose: make the app installable, and make it
 * fail gracefully rather than showing the browser's dinosaur when a phone
 * drops off the network mid-lesson.
 *
 * What it very deliberately does NOT do is cache pages.
 *
 * Every page in this app is specific to whoever is signed in — a guardian's
 * children, a teacher's classes, a student's own marks. A service worker
 * cache is shared by everything on the origin and survives sign-out, so
 * caching HTML here would mean a parent on a shared phone opening the app
 * offline and being shown the previous user's dashboard. That is a data
 * breach delivered by a performance feature, and no amount of cache-busting
 * makes it reliably safe.
 *
 * So only two things are cached: build assets, which are content-hashed and
 * carry no personal data, and one static offline page.
 */

const VERSION = "v1";
const ASSET_CACHE = `assets-${VERSION}`;
const SHELL_CACHE = `shell-${VERSION}`;
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await cache.add(new Request(OFFLINE_URL, { cache: "reload" }));
      // Take over as soon as installed; the previous worker cached nothing
      // sensitive, so there is no reason to wait for every tab to close.
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Drop caches from older versions so a deploy cannot serve stale JS
      // against new HTML.
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name !== ASSET_CACHE && name !== SHELL_CACHE)
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only GET is ever cacheable, and only our own origin.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  /*
   * Never intercept the API. Sign-in, sign-out, refresh and every Server
   * Action live here; a worker sitting in front of them can only cause
   * confusing, hard-to-reproduce auth bugs.
   */
  if (url.pathname.startsWith("/api/")) return;

  // Build assets are immutable and content-hashed, so cache-first is safe
  // and makes a repeat launch feel instant.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Page loads: always from the network, never stored. Offline gets the
  // static fallback instead of the browser's error page.
  if (request.mode === "navigate") {
    event.respondWith(networkOnlyWithOfflineFallback(request));
  }
});

async function cacheFirst(request) {
  const cache = await caches.open(ASSET_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;

  const response = await fetch(request);
  // Only store complete, successful responses — a partial or error response
  // cached here would persist a broken asset until the next deploy.
  if (response.ok && response.status === 200) {
    cache.put(request, response.clone());
  }
  return response;
}

async function networkOnlyWithOfflineFallback(request) {
  try {
    return await fetch(request);
  } catch {
    const cache = await caches.open(SHELL_CACHE);
    const offline = await cache.match(OFFLINE_URL);
    return (
      offline ??
      new Response("You are offline.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    );
  }
}
