import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-6 text-center font-sans">
      <div className="bg-[#111827] border border-slate-800 p-8 rounded-2xl max-w-md w-full">
        <div className="text-4xl mb-3">🚫</div>
        <h1 className="text-xl font-bold text-white">Access Restricted</h1>
        <p className="text-slate-400 text-xs mt-2 mb-6">
          You do not have the necessary security clearance to view this dashboard segment.
        </p>
        <Link
          href="/login"
          className="inline-block bg-indigo-600 text-white text-xs font-semibold px-6 py-2.5 rounded-xl hover:bg-indigo-500 transition-all"
        >
          Return to Login
        </Link>
      </div>
    </div>
  );
}
