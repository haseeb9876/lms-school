"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { printBankChallan } from "@/lib/pdf-challan";
import { 
  LogOut, User, Lock, Award, DollarSign, Calendar, 
  BookOpen, Send, MessageSquare 
} from "lucide-react";

export default function StudentDashboard() {
  const [userData, setUserData] = useState<any>(null);
  const [childrenList, setChildrenList] = useState<any[]>([]);
  const [ticketsList, setTicketsList] = useState<any[]>([]);
  const [activeChildIndex, setActiveChildIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"SUBJECTS" | "GRADES" | "ATTENDANCE" | "FEES" | "DESK">("SUBJECTS");
  const [loading, setLoading] = useState(true);

  // Confidential Desk Form
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchPortalData = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUserData(data.user);
        setChildrenList(data.children || []);
        setTicketsList(data.tickets || []);
      }
    } catch (e) {
      console.error("Error fetching portal profile:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortalData();
  }, []);

  // Determine active profile details
  const hasMultipleChildren = childrenList.length > 1;
  const activeChildProfile = hasMultipleChildren 
    ? childrenList[activeChildIndex] 
    : (userData?.studentProfile || childrenList[0]);

  const studentName = activeChildProfile?.user?.name || userData?.name || "Student";
  const fatherName = activeChildProfile?.fatherName || "N/A";
  const rollNumber = activeChildProfile?.rollNumber || "N/A";
  const className = activeChildProfile?.class 
    ? `${activeChildProfile.class.name} - Section ${activeChildProfile.class.section}` 
    : "Class Assigned";

  const feeInvoices = activeChildProfile?.feeInvoices || [];
  const latestFeeStatus = feeInvoices[0]?.status || "CLEARED / PAID";
  const classAssignments = activeChildProfile?.class?.assignments || [];
  const attendances = activeChildProfile?.attendances || [];
  const examResults = activeChildProfile?.examResults || [];

  // Attendance Stats
  const totalDays = attendances.length;
  const presentDays = attendances.filter((a: any) => a.status === "PRESENT").length;
  const attendancePercentage = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : "100.0";

  const handleSubmitNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim() || !userData) return;
    setSubmitting(true);
    setAlert(null);

    try {
      const res = await fetch("/api/desk/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentId: userData.id,
          subject: `[Student: ${studentName}] ${subject}`,
          message,
        }),
      });

      if (res.ok) {
        setAlert({ type: "success", text: "Confidential note transmitted directly to Principal Office." });
        setSubject("");
        setMessage("");
        fetchPortalData();
      } else {
        setAlert({ type: "error", text: "Failed to transmit note." });
      }
    } catch (err) {
      setAlert({ type: "error", text: "Network error submitting note." });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintChallan = (inv: any) => {
    printBankChallan({
      id: inv.id,
      title: inv.title,
      amount: inv.amount,
      dueDate: inv.dueDate,
      status: inv.status,
      studentName: studentName,
      rollNumber: rollNumber,
      fatherName: fatherName,
      className: className,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] text-slate-100 flex items-center justify-center font-sans">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-400 font-mono">Authenticating Student Workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      {/* Top Header - CNIC Removed for Confidentiality */}
      <header className="h-20 border-b border-slate-800/80 bg-[#080d1a]/80 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-blue-600 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-emerald-500/20">
            S
          </div>
          <div>
            <span className="font-extrabold text-white text-base tracking-tight">Student & Parent Executive Portal</span>
            <span className="block text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
              Greenhill LMS Academic Desk
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-white">{studentName}</div>
            <div className="text-[10px] text-slate-400 font-medium">Roll No: {rollNumber}</div>
          </div>
          <Link
            href="/login"
            className="px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold hover:bg-rose-500/20 transition flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" /> Exit Portal
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full p-8 space-y-8 flex-1">
        {/* Multi-Child Selector Tabs (Visible if Parent has Multiple Children) */}
        {hasMultipleChildren && (
          <div className="bg-[#080d1a] border border-slate-800/90 rounded-2xl p-4 flex items-center gap-3 overflow-x-auto shadow-xl">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-2 flex items-center gap-1.5">
              <User className="w-4 h-4 text-blue-400" /> Family Students ({childrenList.length}):
            </span>
            {childrenList.map((child, idx) => (
              <button
                key={child.id}
                onClick={() => setActiveChildIndex(idx)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                  activeChildIndex === idx
                    ? "bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/25"
                    : "bg-[#030712] border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {child.user?.name || `Student ${idx + 1}`} ({child.class?.name || "Class"})
              </button>
            ))}
          </div>
        )}

        {/* Confidential Student Profile Card (CNIC hidden) */}
        <div className="bg-[#080d1a] border border-slate-800/90 rounded-3xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
          <div className="space-y-2 relative z-10">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">{studentName}</h1>
              <span className="px-3.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-wider">
                {className}
              </span>
            </div>
            <p className="text-xs text-slate-300 font-mono space-x-3">
              <span>Roll Number: <strong className="text-white font-bold">{rollNumber}</strong></span>
              <span>•</span>
              <span>Father Name: <strong className="text-white font-bold">{fatherName}</strong></span>
            </p>
          </div>

          <div className="flex items-center gap-4 relative z-10">
            <div className="bg-[#030712] border border-slate-800/90 px-5 py-3 rounded-2xl text-center">
              <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Fee Clearance
              </div>
              <div className="text-xs font-black text-emerald-400 mt-1 font-mono">{latestFeeStatus}</div>
            </div>

            <div className="bg-[#030712] border border-slate-800/90 px-5 py-3 rounded-2xl text-center">
              <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-400" /> Attendance
              </div>
              <div className="text-xs font-black text-blue-400 mt-1 font-mono">{attendancePercentage}%</div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3 overflow-x-auto">
          {[
            { id: "SUBJECTS", label: "Subjects & Faculty", icon: BookOpen },
            { id: "GRADES", label: "Term Exam Results", icon: Award },
            { id: "ATTENDANCE", label: "Attendance Log", icon: Calendar },
            { id: "FEES", label: "Fee Ledger & Vouchers", icon: DollarSign },
            { id: "DESK", label: "Confidential Desk", icon: Lock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition flex items-center gap-2 whitespace-nowrap ${
                  isActive
                    ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/25"
                    : "bg-[#080d1a] border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}
              >
                <Icon className="w-4 h-4" /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: SUBJECTS & TEACHERS */}
        {activeTab === "SUBJECTS" && (
          <div className="bg-[#080d1a] border border-slate-800/90 rounded-3xl p-6 space-y-4 shadow-xl">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-400" /> Enrolled Class Subjects & Faculty Teachers
            </h2>
            <p className="text-xs text-slate-400">Class subjects and assigned teaching faculty members for {className}.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {classAssignments.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs col-span-3 border border-dashed border-slate-800 rounded-2xl">
                  No subject teachers currently assigned to {className} by Principal.
                </div>
              ) : (
                classAssignments.map((a: any) => (
                  <div key={a.id} className="bg-[#030712] border border-slate-800/90 rounded-2xl p-5 space-y-2">
                    <div className="text-xs text-blue-400 font-bold uppercase tracking-wider">{a.subject}</div>
                    <div className="text-base font-bold text-white">{a.teacher?.name || "Assigned Teacher"}</div>
                    <div className="text-[11px] text-slate-400 font-mono">Faculty Contact: {a.teacher?.phone || "N/A"}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: EXAM RESULTS */}
        {activeTab === "GRADES" && (
          <div className="bg-[#080d1a] border border-slate-800/90 rounded-3xl p-6 space-y-4 shadow-xl">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Award className="w-4 h-4 text-blue-400" /> Term Examination Marksheet
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#0f172a] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Subject</th>
                    <th className="px-6 py-4">Exam Term</th>
                    <th className="px-6 py-4 text-center">Obtained Marks</th>
                    <th className="px-6 py-4 text-center">Total Marks</th>
                    <th className="px-6 py-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {examResults.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No exam results recorded yet for this student.</td>
                    </tr>
                  ) : (
                    examResults.map((r: any) => (
                      <tr key={r.id} className="hover:bg-slate-800/30 transition">
                        <td className="px-6 py-4 font-sans font-bold text-white">{r.subject}</td>
                        <td className="px-6 py-4 text-slate-400">{r.term}</td>
                        <td className="px-6 py-4 text-center text-emerald-400 font-bold">{r.marksObtained}</td>
                        <td className="px-6 py-4 text-center text-slate-400">{r.totalMarks}</td>
                        <td className="px-6 py-4 text-right">
                          <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                            PASSED
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: ATTENDANCE LOG */}
        {activeTab === "ATTENDANCE" && (
          <div className="bg-[#080d1a] border border-slate-800/90 rounded-3xl p-6 space-y-4 shadow-xl">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" /> Daily Attendance Logs
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#0f172a] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4 text-right">Attendance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {attendances.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-6 py-8 text-center text-slate-500">No attendance roll calls recorded yet.</td>
                    </tr>
                  ) : (
                    attendances.map((a: any) => (
                      <tr key={a.id} className="hover:bg-slate-800/30 transition">
                        <td className="px-6 py-4 text-slate-300">{new Date(a.date).toLocaleDateString("en-PK")}</td>
                        <td className="px-6 py-4 text-right">
                          <span className={`px-2.5 py-1 rounded text-[10px] font-bold border ${
                            a.status === "PRESENT" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
                            "bg-rose-500/10 border-rose-500/30 text-rose-400"
                          }`}>
                            {a.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: FEE LEDGER & VOUCHERS */}
        {activeTab === "FEES" && (
          <div className="bg-[#080d1a] border border-slate-800/90 rounded-3xl p-6 space-y-4 shadow-xl">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" /> Fee Vouchers & Bank Challans
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#0f172a] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Voucher Title</th>
                    <th className="px-6 py-4">Due Date</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {feeInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No fee invoices issued yet.</td>
                    </tr>
                  ) : (
                    feeInvoices.map((inv: any) => (
                      <tr key={inv.id} className="hover:bg-slate-800/30 transition">
                        <td className="px-6 py-4 font-sans font-bold text-white">{inv.title}</td>
                        <td className="px-6 py-4 text-slate-400">{new Date(inv.dueDate).toLocaleDateString("en-PK")}</td>
                        <td className="px-6 py-4 font-bold text-white">PKR {inv.amount.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded text-[10px] font-bold border ${
                            inv.status === "PAID" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
                            "bg-rose-500/10 border-rose-500/30 text-rose-400"
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handlePrintChallan(inv)}
                            className="px-3 py-1.5 bg-blue-600/20 border border-blue-500/40 text-blue-300 hover:bg-blue-600/40 rounded-lg transition font-sans font-bold text-xs"
                          >
                            Print 3-Copy Bank Challan
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: CONFIDENTIAL DESK */}
        {activeTab === "DESK" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-6 bg-[#080d1a] border border-slate-800/90 rounded-3xl p-6 space-y-4 shadow-xl">
              <div className="border-b border-slate-800 pb-3">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-400" /> Send Note to Principal Desk
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Direct encrypted note channel. Bypasses teachers completely and lands directly on Principal executive desk.
                </p>
              </div>

              {alert && (
                <div className={`p-4 rounded-xl border text-xs font-semibold ${
                  alert.type === "success" ? "bg-emerald-950/40 border-emerald-800 text-emerald-300" : "bg-rose-950/40 border-rose-800 text-rose-300"
                }`}>
                  {alert.text}
                </div>
              )}

              <form onSubmit={handleSubmitNote} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Subject / Concern</label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Inquiry regarding fee installment"
                    className="w-full bg-[#030712] border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Detailed Message</label>
                  <textarea
                    rows={4}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type confidential note to principal office..."
                    className="w-full bg-[#030712] border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl transition disabled:opacity-50 shadow-lg shadow-amber-600/20 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" /> {submitting ? "Transmitting..." : "Send Confidential Note"}
                </button>
              </form>
            </div>

            {/* Submitted Ticket History */}
            <div className="lg:col-span-6 bg-[#080d1a] border border-slate-800/90 rounded-3xl p-6 space-y-4 shadow-xl">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-400" /> Submitted Inquiries History ({ticketsList.length})
              </h2>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {ticketsList.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
                    No desk tickets sent yet.
                  </div>
                ) : (
                  ticketsList.map((t: any) => (
                    <div key={t.id} className="bg-[#030712] border border-slate-800/90 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs">{t.subject}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          t.status === "OPEN" ? "bg-rose-500/10 border-rose-500/30 text-rose-400" :
                          t.status === "IN_PROGRESS" ? "bg-amber-500/10 border-amber-500/30 text-amber-400" :
                          "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        }`}>
                          {t.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 font-mono whitespace-pre-wrap">{t.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
