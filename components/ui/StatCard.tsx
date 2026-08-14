import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
        <Icon className="h-4 w-4 text-neutral-400" aria-hidden="true" />
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-neutral-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}
