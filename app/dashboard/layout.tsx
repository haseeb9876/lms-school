import { cookies } from 'next/headers';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex">
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
