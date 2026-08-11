"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface AppShellProps {
  children: React.ReactNode;
  userRole?: "PRINCIPAL" | "TEACHER" | "STUDENT" | "PARENT";
  userName?: string;
  userCnic?: string;
}

export default function AppShell({
  children,
  userRole = "STUDENT",
  userName = "User",
  userCnic = "",
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const navItems = [
    { label: "Dashboard", href: `/dashboard/${userRole.toLowerCase()}`, icon: "⚡" },
    { label: "Academic Courses", href: "#courses", icon: "📖" },
    { label: "Attendance & Logs", href: "#attendance", icon: "📅" },
    { label: "Fee Ledger", href: "#fees", icon: "💳" },
    { label: "Certificates", href: "#certificates", icon: "🏆" },
  ];

  if (userRole === "PRINCIPAL") {
    navItems.push({ label: "User Management", href: "/dashboard/principal/users", icon: "👥" });
  }

  return (
    <div className="min-h-screen bg-[#F7F5EE] text-[#111111] flex flex-col md:flex-row antialiased selection:bg-[#9BE870] selection:text-[#050505]">
      {/* Mobile Top Header */}
      <header className="md:hidden bg-[#050505] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#9BE870] text-[#050505] font-black flex items-center justify-center text-sm">
            G
          </div>
          <div>
            <span className="font-bold text-xs tracking-tight block">Greenhill LMS</span>
            <span className="text-[9px] text-[#9BE870] font-semibold tracking-wider uppercase block">
              {userRole} PORTAL
            </span>
          </div>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg bg-white/10 text-white text-xs font-bold"
        >
          {mobileMenuOpen ? "Close" : "Menu"}
        </button>
      </header>

      {/* Desktop Left Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-[#050505] text-white p-5 m-3 rounded-3xl shrink-0 h-[calc(100vh-1.5rem)] sticky top-3 shadow-2xl justify-between">
        <div className="space-y-6">
          {/* Logo Brand Box */}
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-2xl bg-[#9BE870] text-[#050505] font-black flex items-center justify-center text-lg shadow-glow">
              G
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight block leading-tight">
                Greenhill LMS
              </span>
              <span className="text-[10px] text-[#9BE870] font-semibold tracking-wider uppercase">
                {userRole} EXECUTIVE
              </span>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="space-y-1.5 pt-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 ${
                    isActive
                      ? "bg-[#9BE870] text-[#050505] shadow-glow scale-[1.02]"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="pt-4 border-t border-white/10 space-y-3">
          <div className="bg-[#121212] p-3 rounded-2xl border border-white/5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-200 text-slate-900 font-bold flex items-center justify-center text-xs shrink-0">
              {userName.substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-xs font-bold text-white truncate">{userName}</span>
              <span className="block text-[10px] text-slate-400 font-mono truncate">
                {userCnic || userRole}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold transition-all active:scale-95"
          >
            Sign Out &rarr;
          </button>
        </div>
      </aside>

      {/* Mobile Slideout Nav Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#050505] text-white px-4 py-4 space-y-3 border-b border-white/10">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-white/10"
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
          <button
            onClick={handleLogout}
            className="w-full py-2.5 rounded-xl bg-red-500/20 text-red-300 text-xs font-bold"
          >
            Sign Out
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full box-border">
        {children}
      </div>
    </div>
  );
}
