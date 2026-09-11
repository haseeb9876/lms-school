import { cn } from "@/lib/cn";

const SIZES = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
  xl: "h-20 w-20 text-2xl",
} as const;

/**
 * Fixed palette rather than a random hue: the same person keeps the same
 * color on every screen, which makes long class lists scannable.
 */
const PALETTE = [
  "bg-chart-1/15 text-chart-1",
  "bg-chart-2/15 text-chart-2",
  "bg-chart-3/15 text-chart-3",
  "bg-chart-4/15 text-chart-4",
  "bg-chart-5/15 text-chart-5",
  "bg-chart-6/15 text-chart-6",
];

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function paletteIndex(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % PALETTE.length;
}

export interface AvatarProps {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  const shell = cn(
    "flex flex-none items-center justify-center rounded-full font-semibold select-none",
    SIZES[size],
    className
  );

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" aria-hidden="true" className={cn(shell, "object-cover")} />
    );
  }

  return (
    // Decorative: the person's name is always rendered as real text next to
    // the avatar, so announcing the initials again would just be noise.
    <span aria-hidden="true" className={cn(shell, PALETTE[paletteIndex(name)])}>
      {initialsOf(name)}
    </span>
  );
}
