"use client";

import React, { useState, useEffect } from "react";

export default function FinancialDashboard() {
  const [feeRecords, setFeeRecords] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  
  // Invoice Form State
  const [selectedStudent, setSelectedStudent] = useState("");
  const [month, setMonth] = useState("August 2026");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(new Date().toISOString().split("T")[0]);

  const loadData = async () => {
    const [feeRes, userRes] = await Promise.all([
      fetch("/api/financials"),
      fetch("/api/users"),
    ]);

    if (feeRes.ok && userRes.ok) {
      setFeeRecords(await feeRes.json());
      const userList = await userRes.json();
      setStudents(userList.filter((u: any) => u.role === "STUDENT"));
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGenerateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !amount) return;

    const res = await fetch("/api/financials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: selectedStudent, month, amount, dueDate }),
    });

    if (res.ok) {
      setAmount("");
      loadData();
    }
  };

  const handleStatusUpdate = async (recordId: string, status: string) => {
    const res = await fetch("/api/financials", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recordId, status }),
    });

    if (res.ok) loadData();
  };

  // Metrics
  const totalCollected = feeRecords
    .filter((f) => f.status === "PAID")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalPending = feeRecords
    .filter((f) => f.status === "PENDING")
    .reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 p-8 font-sans">
      <div className="mb-8 p-6 bg-[#111827] border border-slate-800 rounded-2xl">
        <span className="text-[10px] uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20 px-3 py-1 rounded-full font-semibold">
          Phase 6 Executive Portal
        </span>
        <h1 className="text-3xl font-bold mt-3">Financial & Fee Management</h1>
        <p className="text-slate-400 text-xs mt-1">
          Issue monthly vouchers, collect tuition, and track revenue streams.
        </p>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5">
          <span className="text-xs text-slate-400 font-semibold uppercase">Total Revenue Collected</span>
          <h2 className="text-2xl font-bold text-emerald-400 mt-2 font-mono">
            PKR {totalCollected.toLocaleString()}
          </h2>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5">
          <span className="text-xs text-slate-400 font-semibold uppercase">Outstanding Receivables</span>
          <h2 className="text-2xl font-bold text-amber-400 mt-2 font-mono">
            PKR {totalPending.toLocaleString()}
          </h2>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5">
          <span className="text-xs text-slate-400 font-semibold uppercase">Invoices Issued</span>
          <h2 className="text-2xl font-bold text-indigo-400 mt-2 font-mono">
            {feeRecords.length} Bills
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Issue Invoice Form */}
        <div className="lg:col-span-4 bg-[#111827] border border-slate-800 rounded-2xl p-6 h-fit">
          <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
            <span>💳</span> Issue Fee Voucher
          </h3>

          <form onSubmit={handleGenerateInvoice} className="space-y-4">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Select Student</label>
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full bg-[#0b0f19] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                required
              >
                <option value="">-- Choose Student --</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.classScope})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Billing Month</label>
              <input
                type="text"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full bg-[#0b0f19] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Amount (PKR)</label>
                <input
                  type="number"
                  placeholder="5000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-[#0b0f19] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-[#0b0f19] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl text-xs transition-all mt-2"
            >
              Generate Fee Voucher
            </button>
          </form>
        </div>

        {/* Fee Record Table */}
        <div className="lg:col-span-8 bg-[#111827] border border-slate-800 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
            <span>📑</span> Fee Ledger & Collection Ledger
          </h3>

          {feeRecords.length === 0 ? (
            <p className="text-xs text-slate-500 italic p-6 text-center">No fee invoices generated yet.</p>
          ) : (
            <div className="space-y-3">
              {feeRecords.map((f) => (
                <div
                  key={f.id}
                  className="p-4 bg-[#0b0f19] border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                >
                  <div>
                    <h4 className="font-semibold text-white">{f.student.name}</h4>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Class: {f.student.classScope} | Month: {f.month}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-bold font-mono text-white">PKR {f.amount}</div>
                      <span className="text-[10px] text-slate-500">Due: {f.dueDate}</span>
                    </div>

                    <select
                      value={f.status}
                      onChange={(e) => handleStatusUpdate(f.id, e.target.value)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-[10px] border border-slate-800 ${
                        f.status === "PAID"
                          ? "bg-emerald-600/20 text-emerald-400"
                          : "bg-amber-600/20 text-amber-400"
                      }`}
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="PAID">PAID</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
