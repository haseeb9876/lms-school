"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ParentDashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/student");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex items-center justify-center font-sans">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs text-slate-400 font-mono">Redirecting to Parent & Student Portal...</p>
      </div>
    </div>
  );
}
