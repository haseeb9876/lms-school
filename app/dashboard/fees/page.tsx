'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/app/components/Navbar';
import Link from 'next/link';
import { DollarSign, Download, CheckCircle2, Clock, Printer } from 'lucide-react';

interface Fee {
  id: string;
  amount: number;
  month: string;
  status: 'PAID' | 'UNPAID';
  student: {
    admissionNo: string;
    user: { name: string; email: string };
    class: { name: string };
  };
}

export default function FeesPage() {
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFees() {
      try {
        const res = await fetch('/api/fees');
        const data = await res.json();
        if (data.success) {
          setFees(data.fees);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadFees();
  }, []);

  const exportToCSV = () => {
    const headers = ['Student Name', 'Admission No', 'Class', 'Month', 'Amount ($)', 'Status'];
    const rows = fees.map((f) => [
      f.student.user.name,
      f.student.admissionNo,
      f.student.class.name,
      f.month,
      f.amount,
      f.status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Fee_Ledger_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-100/60">
      <Navbar />

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-slate-900 rounded-2xl p-6 text-white shadow-lg border border-amber-900/40 flex justify-between items-center">
          <div>
            <span className="bg-amber-500/20 text-amber-300 text-xs font-semibold px-3 py-1 rounded-full border border-amber-500/30">
              Financial Accounting
            </span>
            <h1 className="text-2xl font-bold mt-2">Student Fee Voucher Ledger</h1>
            <p className="text-xs text-slate-300 mt-1">Audit billing, track cleared payments, and download financial reports.</p>
          </div>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-lg"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV Ledger</span>
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
            Loading ledger vouchers...
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Student</th>
                  <th className="p-4">Class</th>
                  <th className="p-4">Billing Month</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Payment Status</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {fees.map((fee) => (
                  <tr key={fee.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-4 font-semibold text-slate-900">
                      {fee.student.user.name}
                      <span className="block text-[10px] text-slate-400 font-mono font-normal">
                        ID: {fee.student.admissionNo}
                      </span>
                    </td>
                    <td className="p-4 font-medium">{fee.student.class.name}</td>
                    <td className="p-4">{fee.month}</td>
                    <td className="p-4 font-bold text-slate-900">${fee.amount}</td>
                    <td className="p-4">
                      {fee.status === 'PAID' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Settled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" /> Overdue
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/dashboard/fees/print/${fee.id}`}
                        className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg transition"
                      >
                        <Printer className="w-3.5 h-3.5" /> Print Challan
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
