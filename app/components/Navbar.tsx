'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  BookOpen, 
  Award, 
  Users, 
  GraduationCap, 
  UserCheck, 
  DollarSign, 
  ShieldCheck,
  FileText,
  Settings,
  Bell
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const [schoolName, setSchoolName] = useState('Greenhill LMS');

  useEffect(() => {
    async function fetchSchoolName() {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.success && data.settings?.schoolName) {
          setSchoolName(data.settings.schoolName);
        }
      } catch (err) {
        console.error(err);
      }
    }
    fetchSchoolName();
  }, []);

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Gradebook', href: '/dashboard/teacher', icon: Award },
    { label: 'Transcripts', href: '/dashboard/transcripts', icon: FileText },
    { label: 'Students', href: '/dashboard/students', icon: GraduationCap },
    { label: 'Attendance', href: '/dashboard/attendance', icon: UserCheck },
    { label: 'Fee Ledger', href: '/dashboard/fees', icon: DollarSign },
    { label: 'Parent Alerts', href: '/dashboard/notifications', icon: Bell },
    { label: 'Executive', href: '/dashboard/principal', icon: ShieldCheck },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  return (
    <header className="bg-slate-950 text-white border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-sm shadow-md shadow-indigo-500/20">
            {schoolName.charAt(0)}
          </div>
          <Link href="/" className="font-extrabold text-sm tracking-tight text-white hover:text-indigo-400 transition truncate max-w-[200px]">
            {schoolName}
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl transition ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
