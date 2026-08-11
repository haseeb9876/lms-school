'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Users, Calendar, Clock, BookOpen, 
  FileText, CheckSquare, DollarSign, Bell, 
  Settings, UserCheck, ShieldAlert 
} from 'lucide-react';

interface RoleShellProps {
  role: 'PRINCIPAL' | 'TEACHER' | 'STUDENT';
  userName: string;
}

export default function RoleShell({ role, userName }: RoleShellProps) {
  const getModules = () => {
    switch (role) {
      case 'PRINCIPAL':
        return [
          { title: 'Info Desk', icon: Users, href: '/dashboard/classes', color: 'bg-blue-500' },
          { title: 'Teacher Directory', icon: UserCheck, href: '/dashboard/teacher', color: 'bg-indigo-500' },
          { title: 'Student Records', icon: BookOpen, href: '/dashboard/students', color: 'bg-emerald-500' },
          { title: 'School Circulars', icon: Bell, href: '/dashboard/announcements', color: 'bg-amber-500' },
          { title: 'Fee Management', icon: DollarSign, href: '/dashboard', color: 'bg-rose-500' },
          { title: 'System Settings', icon: Settings, href: '/settings', color: 'bg-slate-600' },
        ];
      case 'TEACHER':
        return [
          { title: 'Mark Attendance', icon: CheckSquare, href: '/dashboard/attendance', color: 'bg-emerald-500' },
          { title: 'Class Timetable', icon: Clock, href: '/dashboard/classes', color: 'bg-blue-500' },
          { title: 'Assignments', icon: FileText, href: '/dashboard', color: 'bg-purple-500' },
          { title: 'Circulars', icon: Bell, href: '/dashboard/announcements', color: 'bg-amber-500' },
        ];
      case 'STUDENT':
      default:
        return [
          { title: 'My Timetable', icon: Clock, href: '/dashboard/classes', color: 'bg-blue-500' },
          { title: 'Attendance Log', icon: CheckSquare, href: '/dashboard/attendance', color: 'bg-emerald-500' },
          { title: 'Homework & Tasks', icon: FileText, href: '/dashboard', color: 'bg-purple-500' },
          { title: 'School Circulars', icon: Bell, href: '/dashboard/announcements', color: 'bg-amber-500' },
        ];
    }
  };

  const modules = getModules();

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Header Banner */}
      <div className="max-w-6xl mx-auto bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-6 text-white shadow-lg mb-8">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-xs uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full font-semibold">
              {role} WORKSPACE
            </span>
            <h1 className="text-2xl font-bold mt-2">Welcome back, {userName}</h1>
            <p className="text-sm opacity-90 mt-1">Greenhill School LMS Management Portal</p>
          </div>
          <Link 
            href="/api/logout" 
            className="bg-white text-orange-600 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-orange-50 transition"
          >
            Log Out
          </Link>
        </div>
      </div>

      {/* Grid Features */}
      <div className="max-w-6xl mx-auto">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Quick Access Modules</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {modules.map((mod, idx) => {
            const Icon = mod.icon;
            return (
              <Link key={idx} href={mod.href}>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition flex flex-col items-center text-center group cursor-pointer">
                  <div className={`${mod.color} text-white p-4 rounded-2xl mb-3 group-hover:scale-105 transition-transform`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-semibold text-slate-700 group-hover:text-orange-600 transition">
                    {mod.title}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}