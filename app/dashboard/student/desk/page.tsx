"use client";

import React, { useState, useEffect, useCallback } from "react";

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  createdAt: string;
}

export default function ParentStudentDeskPage() {
  const [parentId, setParentId] = useState<string>("3333333333333"); // Seed default CNIC / ID
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchParentTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/desk/tickets?parentId=${parentId}`);
      const data = await res.json();
      if (res.ok) {
        setTickets(data.tickets || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [parentId]);

  useEffect(() => {
    fetchParentTickets();
  }, [fetchParentTickets]);

  const handleSubmitNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setSubmitting(true);
    setAlert(null);

    try {
      const res = await fetch("/api/desk/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId, subject, message }),
      });

      const data = await res.json();
      if (res.ok) {
        setAlert({ type: "success", text: "Confidential note dispatched directly to Principal Office." });
        setSubject("");
        setMessage("");
        fetchParentTickets();
      } else {
        setAlert({ type: "error", text: data.error || "Submission failed." });
      }
    } catch (err) {
      setAlert({ type: "error", text: "Network error submitting note." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="border-b border-slate-800 pb-4">
          <h1 className="text-2xl font-bold text-white">Confidential Principal Desk</h1>
          <p className="text-slate-400 text-sm mt-1">
            Send direct encrypted notes directly to top management. Faculty members cannot view this stream.
          </p>
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

        {/* Form Submission Block */}
        <form onSubmit={handleSubmitNote} className="bg-[#111827] border border-slate-800 rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Subject</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Inquiry regarding fee adjustment / Academic concern"
              className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Confidential Note</label>
            <textarea
              rows={4}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Provide clear details for the Principal office..."
              className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-lg transition disabled:opacity-50"
            >
              {submitting ? "Transmitting Note..." : "Send Note to Principal Desk"}
            </button>
          </div>
        </form>

        {/* History Stream */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
          <h2 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">
            Previous Communications
          </h2>
          <div className="space-y-4">
            {loading ? (
              <div className="text-xs text-slate-500">Loading tickets...</div>
            ) : tickets.length === 0 ? (
              <div className="text-xs text-slate-500">No active tickets submitted yet.</div>
            ) : (
              tickets.map((t) => (
                <div key={t.id} className="bg-[#0b0f19] border border-slate-800 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white text-sm">{t.subject}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        t.status === "OPEN"
                          ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                          : t.status === "IN_PROGRESS"
                          ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                          : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>
                  <div className="font-mono text-xs text-slate-300 whitespace-pre-wrap">{t.message}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
