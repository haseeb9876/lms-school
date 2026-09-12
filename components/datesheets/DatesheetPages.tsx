"use client";

import { useState } from "react";
import { X, ZoomIn } from "lucide-react";

export interface DatesheetPageImage {
  id: string;
  caption: string | null;
}

/**
 * The photographed pages of a datesheet, with a full-screen viewer.
 *
 * The zoom is the whole point. A datesheet photographed off a wall is a
 * dense table, and the person most likely to open it is a parent on a
 * phone — so the inline image is a readable thumbnail and one tap gives the
 * full resolution, pannable, against a dark backdrop.
 *
 * Images are loaded from an authenticated route rather than a public file
 * URL, because a datesheet can be addressed to a single class.
 */
export function DatesheetPages({ pages }: { pages: DatesheetPageImage[] }) {
  const [zoomed, setZoomed] = useState<DatesheetPageImage | null>(null);

  if (pages.length === 0) return null;

  return (
    <>
      <ul className="grid gap-4 sm:grid-cols-2">
        {pages.map((page, index) => (
          <li key={page.id} className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setZoomed(page)}
              className="group relative block overflow-hidden rounded-lg border border-line bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              aria-label={`View page ${index + 1} full size`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/datesheets/pages/${page.id}`}
                alt={page.caption ?? `Datesheet page ${index + 1}`}
                // Lazy so a datesheet with a dozen photographed pages does
                // not pull several megabytes before anything is visible.
                loading="lazy"
                className="w-full object-contain transition-transform duration-200 group-hover:scale-[1.01]"
              />
              <span
                aria-hidden="true"
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-md bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <ZoomIn className="h-4 w-4" />
              </span>
            </button>
            {page.caption && <p className="text-xs text-fg-subtle">{page.caption}</p>}
          </li>
        ))}
      </ul>

      {zoomed && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/90 p-2 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Datesheet page"
          data-print-hide
        >
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setZoomed(null)}
              aria-label="Close"
              className="rounded-md p-2 text-white/80 hover:bg-white/10 hover:text-white"
            >
              <X className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          {/* Scrolls in both directions, so a wide table can be panned
              rather than being shrunk to fit and made unreadable. */}
          <div className="flex-1 overflow-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/datesheets/pages/${zoomed.id}`}
              alt={zoomed.caption ?? "Datesheet page"}
              className="mx-auto max-w-none"
            />
          </div>
          {zoomed.caption && (
            <p className="px-2 py-2 text-center text-sm text-white/80">{zoomed.caption}</p>
          )}
        </div>
      )}
    </>
  );
}
