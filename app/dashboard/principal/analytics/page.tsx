"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

export default function PrincipalAnalyticsPage() {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => setUsers(data));
  }, []);

  const totalStudents = users.filter((u) => u.role === "STUDENT").length;
  const totalTeachers = users.filter((u) => u.role === "TEACHER").length;

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 p-8 font-sans">
      <div className="mb-6 flex justify-between items-center">
        <Link href="/dashboard/principal" className="text-xs text-indigo-400 hover:underline">
          ← Back to Principal Dashboard
        </Link>
      </div>

      <div className="mb-8 p-6 bg-[#111827] border border-slate-800 rounded-2xl flex justify-between items-center">
        <div>
          <span className="text-[10px] uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20 px-3 py-1 rounded-full font-semibold">
            Institutional Insights
          </span>
          <h1 className="text-3xl font-bold mt-2">School Academic Analytics</h1>
          <p className="text-slate-400 text-xs mt-1">Institutional metrics, enrollment ratios, and overall academic status</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-[#111827] border border-slate-800 rounded-2xl">
          <p className="text-xs text-slate-400 font-medium">Total Enrolled Students</p>
          <h2 className="text-3xl font-bold text-indigo-400 mt-2 font-mono">{totalStudents}</h2>
        </div>

        <div className="p-6 bg-[#111827] border border-slate-800 rounded-2xl">
          <p className="text-xs text-slate-400 font-medium">Active Faculty Members</p>
          <h2 className="text-3xl font-bold text-emerald-400 mt-2 font-mono">{totalTeachers}</h2>
        </div>

        <div className="p-6 bg-[#111827] border border-slate-800 rounded-2xl">
          <p className="text-xs text-slate-400 font-medium">Student to Teacher Ratio</p>
          <h2 className="text-3xl font-bold text-amber-400 mt-2 font-mono">
            {totalTeachers > 0 ? `${(totalStudents / totalTeachers).toFixed(1)} : 1` : "N/A"}
          </h2>
        </div>
      </div>
    </div>
  );
}
