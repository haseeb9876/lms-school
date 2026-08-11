import Link from 'next/link';

export default function SettingsPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/dashboard" className="text-sm text-orange-600 font-semibold">← Back to Dashboard</Link>
      <h1 className="text-2xl font-bold mt-2 text-slate-800">System Settings</h1>
      <p className="text-slate-500 mt-1">School profile and system preferences.</p>
    </div>
  );
}
