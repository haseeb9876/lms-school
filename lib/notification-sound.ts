/**
 * The alert chime.
 *
 * Synthesised with the Web Audio API rather than loaded as an audio file:
 * no asset to download on a slow connection, nothing to 404, and it works
 * offline. Two short notes a fifth apart read as a notification rather than
 * an alarm — this fires for a homework notice as often as anything urgent,
 * and a harsh tone would get the whole feature switched off.
 *
 * Browsers refuse to start audio before the user has interacted with the
 * page, so the first chime after a cold load may be silently dropped. That
 * is the browser's rule and not worth fighting; the toast still appears.
 */

let context: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  const AudioContextClass =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;

  // One context reused for the life of the page — browsers cap how many a
  // document may create, and a new one per chime hits that limit quickly.
  context ??= new AudioContextClass();
  return context;
}

function playNote(ctx: AudioContext, frequency: number, startAt: number, duration: number) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = frequency;

  // A quick fade in and out: a square-edged start and stop produces an
  // audible click on most speakers.
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(0.18, startAt + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.02);
}

export async function playNotificationChime(): Promise<void> {
  const ctx = getContext();
  if (!ctx) return;

  try {
    // Autoplay policy suspends the context until a gesture has happened.
    if (ctx.state === "suspended") await ctx.resume();
    if (ctx.state !== "running") return;

    const now = ctx.currentTime;
    playNote(ctx, 880, now, 0.12); // A5
    playNote(ctx, 1318.5, now + 0.11, 0.18); // E6
  } catch {
    // Audio is a nicety here — the toast and the badge carry the message.
  }
}
