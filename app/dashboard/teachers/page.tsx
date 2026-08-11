import React from 'react';
import Navbar from '@/app/components/Navbar';
import { PrismaClient } from '@prisma/client';
import { Users, Mail, BookOpen, GraduationCap } from 'lucide-react';

const prisma = new PrismaClient();

async function getTeachers() {
  try {
    return await prisma.teacher.findMany({
      include: {
        user: true,
        classes: true, // Prisma maps teacher to classes directly
      },
    });
  } catch (error) {
    console.error('Failed to fetch teachers:', error);
    return [];
  }
}

export default async function TeachersPage() {
  const teachers = await getTeachers();

  return (
    <div className="min-h-screen bg-slate-100/60">
      <Navbar />

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-slate-900 rounded-2xl p-6 text-white shadow-lg border border-purple-900/50 flex justify-between items-center">
          <div>
            <span className="bg-purple-500/20 text-purple-300 text-xs font-semibold px-3 py-1 rounded-full border border-purple-500/30">
              Academic Faculty
            </span>
            <h1 className="text-2xl font-bold mt-2">Teaching Staff Directory</h1>
            <p className="text-xs text-slate-300 mt-1">Faculty members, assigned departments, and course responsibilities.</p>
          </div>
          <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/10 text-right">
            <span className="text-2xl font-black text-purple-300">{teachers.length}</span>
            <p className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold">Faculty Staff</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {teachers.map((t) => (
            <div
              key={t.id}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-purple-300 transition group space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center font-bold text-base group-hover:bg-purple-600 group-hover:text-white transition">
                  {t.user?.name ? t.user.name.charAt(0) : 'T'}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-purple-600 transition">
                    {t.user?.name || 'Faculty Member'}
                  </h3>
                  <span className="inline-block text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100 mt-0.5">
                    Dept: {t.department || 'General'}
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{t.user?.email || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                  <span>Assigned Classes: {t.classes?.length || 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
