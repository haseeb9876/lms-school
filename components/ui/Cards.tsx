import React from "react";

// 1. Stat Card
export function StatCard({
  title,
  value,
  subtitle,
  accentColor = "lime",
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  accentColor?: "lime" | "gold" | "dark";
}) {
  const colorMap = {
    lime: "bg-[#EAFBDE] border-[#B8F28F] text-[#050505]",
    gold: "bg-[#FFF8D6] border-[#FFE680] text-[#050505]",
    dark: "bg-[#050505] text-white border-[#121212]",
  };

  return (
    <div className={`p-5 rounded-3xl border shadow-soft ${colorMap[accentColor]} transition-all duration-200 hover:shadow-hover`}>
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
        {title}
      </span>
      <div className="text-2xl sm:text-3xl font-black tracking-tight">{value}</div>
      {subtitle && <span className="text-xs font-semibold text-slate-600 block mt-1">{subtitle}</span>}
    </div>
  );
}

// 2. Gamified Achievement Card
export function AchievementCard({
  rank = "Level 4 Scholar",
  points = "1,450 XP",
  badge = "🏆 Top 5%",
}: {
  rank?: string;
  points?: string;
  badge?: string;
}) {
  return (
    <div className="bg-[#050505] text-white p-6 rounded-3xl shadow-2xl border border-white/10 relative overflow-hidden flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="px-3 py-1 rounded-full bg-[#FFE680] text-[#050505] font-black text-xs shadow-md">
          {badge}
        </span>
        <span className="text-xs font-mono text-slate-400">GAMIFIED RANK</span>
      </div>

      <div className="my-4">
        <span className="text-xs text-slate-400 font-semibold block uppercase">Current Standing</span>
        <div className="text-2xl sm:text-3xl font-extrabold text-[#9BE870]">{rank}</div>
      </div>

      <div className="flex items-center justify-between border-t border-white/10 pt-3 text-xs font-semibold">
        <span className="text-slate-400">Total Reward Points</span>
        <span className="text-[#FFE680] font-mono font-bold text-sm">{points}</span>
      </div>
    </div>
  );
}

// 3. Progress Bar
export function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden p-0.5 border border-slate-300">
      <div
        className="bg-[#9BE870] h-full rounded-full transition-all duration-500 shadow-glow"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  );
}
