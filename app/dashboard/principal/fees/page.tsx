"use client";

import React, { useState, useEffect } from "react";
import { printBankChallan } from "@/lib/pdf-challan";

interface Invoice {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  paidAmount: number;
  status: "PENDING" | "PARTIAL" | "PAID" | "OVERDUE";
  student: {
    user: { name: string; cnic: string };
    rollNumber: string;
    fatherName: string;
    class: { name: string; section: string };
  };
}

export default function PrincipalFeeLedgerPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [classes, setClasses] = useState<Array<{ id: string; name: string; section: string }>>([]);
  const [loading, setLoading] = useState(true);

  // Form State for Batch Generation
  const [selectedClass, setSelectedClass] = useState("");
  const [title, setTitle] = useState("Monthly Fee - August 2026");
  const [amount, setAmount] = useState(15000);
  const [dueDate, setDueDate] = useState("2026-08-25");
  const [generating, setGenerating] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchFeeData = async () => {
    setLoading(true);
    try {
      const [resInvoices, resClasses] = await Promise.all([
        fetch("/api/fees"),
        fetch("/api/classes"),
      ]);

      const dataInvoices = await resInvoices.json();
      const dataClasses = await resClasses.json();

      if (resInvoices.ok) setInvoices(dataInvoices.invoices || []);
      if (resClasses.ok) {
        setClasses(dataClasses.classes || []);
        if (dataClasses.classes?.length > 0) setSelectedClass(dataClasses.classes[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeeData();
  }, []);

  const handleGenerateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass) return;
    setGenerating(true);
    setAlert(null);

    try {
      const res = await fetch("/api/fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId: selectedClass, title, amount, dueDate }),
      });

      const data = await res.json();
      if (res.ok) {
        setAlert({ type: "success", text: data.message });
        fetchFeeData();
      } else {
        setAlert({ type: "error", text: data.error || "Batch generation failed." });
      }
    } catch (err) {
      setAlert({ type: "error", text: "Network error occurred." });
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdateStatus = async (invoiceId: string, status: "PAID" | "PENDING") => {
    try {
      const res = await fetch("/api/fees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId, status, paidAmount: status === "PAID" ? amount : 0 }),
      });
      if (res.ok) fetchFeeData();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrint = (inv: Invoice) => {
    printBankChallan({
      id: inv.id,
      title: inv.title,
      amount: inv.amount,
      dueDate: inv.dueDate,
      status: inv.status,
      studentName: inv.student.user.name,
      rollNumber: inv.student.rollNumber,
      fatherName: inv.student.fatherName,
      className: `${inv.student.class.name}-${inv.student.class.section}`,
    });
  };

  // Metrics Aggregation
  const totalReceivables = invoices.reduce((acc, curr) => acc + curr.amount, 0);
  const totalCleared = invoices
    .filter((i) => i.status === "PAID")
    .reduce((acc, curr) => acc + curr.amount, 0);
  const totalPending = totalReceivables - totalCleared;

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-5 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Institutional Fee Management</h1>
            <p className="text-slate-400 text-sm mt-1">
              Issue batch fee invoices, track clearance ledgers, and export 3-Copy Bank Challan PDFs.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3">
            <div className="bg-[#111827] border border-slate-800 px-4 py-2 rounded-lg">
              <div className="text-[10px] uppercase text-slate-400 font-semibold">Total Receivables</div>
              <div className="text-sm font-bold text-white">PKR {totalReceivables.toLocaleString()}</div>
            </div>
            <div className="bg-[#111827] border border-slate-800 px-4 py-2 rounded-lg">
              <div className="text-[10px] uppercase text-emerald-400 font-semibold">Cleared</div>
              <div className="text-sm font-bold text-emerald-400">PKR {totalCleared.toLocaleString()}</div>
            </div>
            <div className="bg-[#111827] border border-slate-800 px-4 py-2 rounded-lg">
              <div className="text-[10px] uppercase text-rose-400 font-semibold">Pending</div>
              <div className="text-sm font-bold text-rose-400">PKR {totalPending.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {alert && (
          <div
            className={`p-4 rounded-lg border text-sm font-medium ${
              alert.type === "success"
                ? "bg-emerald-950/40 border-emerald-800 text-emerald-300"
                : "bg-rose-950/40 border-rose-800 text-rose-300"
            }`}
          >
            {alert.text}
          </div>
        )}

        {/* Batch Invoice Generation Form */}
        <form onSubmit={handleGenerateBatch} className="bg-[#111827] border border-slate-800 rounded-xl p-5 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Target Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} - {c.section}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Voucher Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Amount (PKR)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={generating || !selectedClass}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs py-2.5 rounded-lg transition disabled:opacity-50"
          >
            {generating ? "Generating..." : "Issue Batch Vouchers"}
          </button>
        </form>

        {/* Ledger Table */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-[#1e293b]/50 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Voucher No</th>
                  <th className="px-6 py-4">Roll No</th>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Class</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                      Loading fee ledger...
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                      No invoices issued yet.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-800/30 transition">
                      <td className="px-6 py-4 font-mono text-xs text-slate-400 font-semibold">
                        VCH-{inv.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-300">{inv.student.rollNumber}</td>
                      <td className="px-6 py-4 font-medium text-white">{inv.student.user.name}</td>
                      <td className="px-6 py-4 text-slate-400">
                        {inv.student.class.name}-{inv.student.class.section}
                      </td>
                      <td className="px-6 py-4 font-semibold text-white">
                        PKR {inv.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            inv.status === "PAID"
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                              : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {inv.status === "PENDING" ? (
                            <button
                              onClick={() => handleUpdateStatus(inv.id, "PAID")}
                              className="px-2.5 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium"
                            >
                              Clear Fee
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateStatus(inv.id, "PENDING")}
                              className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                            >
                              Mark Pending
                            </button>
                          )}
                          <button
                            onClick={() => handlePrint(inv)}
                            className="px-2.5 py-1 text-xs bg-blue-600/20 border border-blue-500/40 text-blue-300 hover:bg-blue-600/40 rounded font-medium"
                          >
                            Print Challan PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
