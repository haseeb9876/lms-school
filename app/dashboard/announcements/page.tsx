import Link from 'next/link';

export default function AnnouncementsPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/dashboard" className="text-sm text-orange-600 font-semibold">← Back to Dashboard</Link>
      <h1 className="text-2xl font-bold mt-2 text-slate-800">School Circulars & Announcements</h1>
      <div className="mt-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <span className="text-xs text-amber-600 font-bold uppercase">Important Notice</span>
        <h3 className="font-bold text-slate-800 mt-1">Mid-Term Examinations Schedule</h3>
        <p className="text-slate-600 text-sm mt-2">The upcoming term assessments will commence next week. All students are advised to prepare.</p>
      </div>
    </div>
  );
}
