import Link from 'next/link';

export default function ClassesPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/dashboard" className="text-sm text-orange-600 font-semibold">← Back to Dashboard</Link>
      <h1 className="text-2xl font-bold mt-2 text-slate-800">Class Management & Timetable</h1>
      <p className="text-slate-500 mt-1">Overview of registered school classes and daily schedules.</p>
      
      <div className="mt-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="font-bold text-lg text-slate-700">Class 10 - Section A</h2>
        <p className="text-sm text-slate-500 mb-4">Class Teacher: Ms. Ayesha Malik</p>
        <span className="bg-emerald-100 text-emerald-800 text-xs px-3 py-1 rounded-full font-semibold">Active Session</span>
      </div>
    </div>
  );
}
