import React from 'react';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';
import { PrismaClient } from '@prisma/client';
import { 
  BookOpen, 
  Award, 
  GraduationCap, 
  UserCheck, 
  DollarSign, 
  Users, 
  ArrowRight, 
  ShieldCheck, 
  TrendingUp,
  FileCheck2,
  AlertCircle
} from 'lucide-react';

const prisma = new PrismaClient();

async function getSystemMetrics() {
  try {
    const studentCount = await prisma.student.count();
    const teacherCount = await prisma.teacher.count();
    const submissionCount = await prisma.submission.count();
    const pendingFees = await prisma.fee.count({ where: { status: 'UNPAID' } });

    return { studentCount, teacherCount, submissionCount, pendingFees };
  } catch (err) {
    return { studentCount: 0, teacherCount: 0, submissionCount: 0, pendingFees: 0 };
  }
}

export default async function DashboardHome() {
  const metrics = await getSystemMetrics();

  const cards = [
    {
      title: 'Student Workspace',
      desc: 'Submit coursework, upload assignments, and review detailed faculty grades.',
      href: '/dashboard/assignments',
      icon: BookOpen,
      badge: `${metrics.submissionCount} Submissions`,
      color: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    },
    {
      title: 'Faculty Gradebook',
      desc: 'Review incoming homework, assign scores out of 100, and leave student feedback.',
      href: '/dashboard/grading',
      icon: Award,
      badge: 'Evaluation Portal',
      color: 'bg-purple-50 text-purple-600 border-purple-100',
    },
    {
      title: 'Enrolled Students',
      desc: 'Manage active student profiles, admission numbers, and class enrollments.',
      href: '/dashboard/students',
      icon: GraduationCap,
      badge: `${metrics.studentCount} Active`,
      color: 'bg-blue-50 text-blue-600 border-blue-100',
    },
    {
      title: 'Academic Faculty',
      desc: 'Inspect teaching staff directory, assigned departments, and classes.',
      href: '/dashboard/teachers',
      icon: Users,
      badge: `${metrics.teacherCount} Teachers`,
      color: 'bg-teal-50 text-teal-600 border-teal-100',
    },
    {
      title: 'Daily Attendance',
      desc: 'Real-time roll call tracking for student daily attendance records.',
      href: '/dashboard/attendance',
      icon: UserCheck,
      badge: 'Live Roll Call',
      color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    },
    {
      title: 'Fee Ledger & Billing',
      desc: 'Monitor monthly tuition fee vouchers, cleared balances, and pending dues.',
      href: '/dashboard/fees',
      icon: DollarSign,
      badge: `${metrics.pendingFees} Pending`,
      color: 'bg-amber-50 text-amber-600 border-amber-100',
    },
    {
      title: 'Executive Command Center',
      desc: 'High-level executive analytics for principal oversight and financial revenue.',
      href: '/dashboard/principal',
      icon: ShieldCheck,
      badge: 'Admin Panel',
      color: 'bg-slate-100 text-slate-800 border-slate-200',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100/60">
      <Navbar />

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Hero Section with Enterprise Live Stats */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-8 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row justify-between md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="bg-indigo-500/20 text-indigo-300 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-indigo-500/30">
                LMS System Health • Operational
              </span>
            </div>
            <h1 className="text-3xl font-black mt-3 tracking-tight">Greenhill Enterprise Portal</h1>
            <p className="text-xs text-slate-300 mt-1 max-w-lg leading-relaxed">
              Real-time school management dashboard with integrated database relations.
            </p>
          </div>

          {/* Quick Metrics Header Overlay */}
          <div className="grid grid-cols-2 gap-3 bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
            <div className="space-y-0.5">
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Total Students</p>
              <p className="text-xl font-black text-indigo-300 flex items-center gap-1">
                {metrics.studentCount} <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Pending Dues</p>
              <p className="text-xl font-black text-amber-300 flex items-center gap-1">
                {metrics.pendingFees} <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              </p>
            </div>
          </div>
        </div>

        {/* Workspace Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className="bg-white p-6 rounded-2xl border border-slate-200/80 hover:border-indigo-500 hover:shadow-xl transition-all duration-200 group flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${card.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200/60">
                      {card.badge}
                    </span>
                  </div>

                  <div>
                    <h2 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition">
                      {card.title}
                    </h2>
                    <p className="text-xs text-slate-500 leading-relaxed mt-1">{card.desc}</p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-600">
                  <span>Open Module</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
