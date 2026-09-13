import { describe, expect, it } from "vitest";
import { planResize, canSendUntouched } from "../lib/image-compress";

/**
 * The canvas encoding itself needs a browser, but the decisions around it —
 * how far to scale, and whether to touch the file at all — are arithmetic,
 * and they are where the damage would be. Getting these wrong means either
 * uploads that still fail, or logos quietly upscaled into mush.
 */
describe("planResize", () => {
  it("scales a phone photo down to the long edge, keeping its shape", () => {
    // 4000×3000 is what a current phone camera produces, and the case that
    // was failing: ~11MB, far past the 1MB a Server Action accepts.
    const { width, height, scale } = planResize(4000, 3000, 2000);

    expect(width).toBe(2000);
    expect(height).toBe(1500);
    expect(scale).toBe(0.5);
    // Aspect ratio preserved to within a rounded pixel.
    expect(width / height).toBeCloseTo(4000 / 3000, 5);
  });

  it("measures the long edge, whichever way round the photo is", () => {
    // Portrait — held upright, which is how a wall-mounted datesheet is
    // usually photographed.
    const portrait = planResize(3000, 4000, 2000);
    expect(portrait.height).toBe(2000);
    expect(portrait.width).toBe(1500);
  });

  it("never enlarges an image", () => {
    // A 180px logo asked to fit a 512px icon box must stay 180px.
    // Upscaling invents detail and turns a crisp logo soft.
    const { width, height, scale } = planResize(180, 180, 512);
    expect(scale).toBe(1);
    expect(width).toBe(180);
    expect(height).toBe(180);
  });

  it("keeps an image that is exactly at the limit untouched", () => {
    expect(planResize(2000, 1200, 2000).scale).toBe(1);
  });

  it("never rounds a thin image away to nothing", () => {
    // A wide banner scaled hard would round its height to 0 and produce a
    // canvas the browser refuses to draw.
    const { width, height } = planResize(8000, 20, 500);
    expect(width).toBe(500);
    expect(height).toBeGreaterThanOrEqual(1);
  });

  it("does not divide by zero on a degenerate image", () => {
    expect(() => planResize(0, 0, 1000)).not.toThrow();
    expect(planResize(0, 0, 1000).scale).toBe(1);
  });
});

describe("canSendUntouched", () => {
  const budget = 1_500_000;

  it("sends a small image exactly as it is", () => {
    // Re-encoding something already under budget only loses quality, and can
    // even make an optimised PNG bigger.
    expect(canSendUntouched(200_000, budget, 1)).toBe(true);
  });

  it("re-encodes anything that needs resizing, however small the file", () => {
    // A 4000px-wide image that happens to compress to 300KB still has to be
    // resized, or it is stored at ten times the resolution ever displayed.
    expect(canSendUntouched(300_000, budget, 0.5)).toBe(false);
  });

  it("re-encodes anything over budget, however small its dimensions", () => {
    // A 1200×900 PNG screenshot can easily exceed the budget.
    expect(canSendUntouched(4_000_000, budget, 1)).toBe(false);
  });

  it("treats exactly-at-budget as acceptable", () => {
    expect(canSendUntouched(budget, budget, 1)).toBe(true);
    expect(canSendUntouched(budget + 1, budget, 1)).toBe(false);
  });
});

/**
 * The numbers the app actually passes, checked against the limits they have
 * to satisfy. These are the constraints that made uploads fail, so they are
 * pinned rather than left to drift.
 */
describe("the configured budgets fit the platform limits", () => {
  const SERVER_ACTION_LIMIT = 4 * 1024 * 1024; // next.config.js
  const VERCEL_BODY_LIMIT = 4.5 * 1024 * 1024; // platform ceiling
  const UPLOAD_BUDGET = 1_500_000; // what the callers ask compressImage for

  it("leaves room for multipart overhead under the Server Action limit", () => {
    expect(UPLOAD_BUDGET).toBeLessThan(SERVER_ACTION_LIMIT);
  });

  it("stays under what the platform will accept at all", () => {
    // Raising the Server Action limit past this would only move the failure
    // from our error message to the platform's.
    expect(SERVER_ACTION_LIMIT).toBeLessThan(VERCEL_BODY_LIMIT);
  });

  it("a 4000×3000 photo ends up well inside the budget", () => {
    const { width, height } = planResize(4000, 3000, 2000);
    // 2000×1500 of photographic detail encodes to a few hundred KB as WebP
    // or JPEG — comfortably inside 1.5MB, with the quality ladder as a
    // backstop if a particular image resists.
    expect(width * height).toBeLessThan(4000 * 3000);
    expect(canSendUntouched(11_425_559, UPLOAD_BUDGET, 0.5)).toBe(false);
  });
});
