"use client";

import React, { useState, useEffect } from "react";

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  createdAt: string;
  updatedAt: string;
  parent: {
    name: string;
    cnic: string;
    phone: string;
    studentProfile?: {
      rollNumber: string;
      class?: { name: string; section: string };
    };
  };
}

export default function PrincipalDeskPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTab, setActiveTab] = useState<"ALL" | "OPEN" | "IN_PROGRESS" | "RESOLVED">("ALL");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [responseText, setResponseText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/desk/tickets");
      const data = await res.json();
      if (res.ok) {
        setTickets(data.tickets || []);
        if (data.tickets && data.tickets.length > 0 && !selectedTicket) {
          setSelectedTicket(data.tickets[0]);
        }
      }
    } catch (err) {
      console.error("Error fetching tickets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleUpdateStatus = async (status: "OPEN" | "IN_PROGRESS" | "RESOLVED") => {
    if (!selectedTicket) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/desk/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: selectedTicket.id, status }),
      });
      if (res.ok) {
        await fetchTickets();
        setSelectedTicket((prev) => (prev ? { ...prev, status } : null));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !responseText.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/desk/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: selectedTicket.id,
          responseNote: responseText,
          status: "IN_PROGRESS",
        }),
      });
      if (res.ok) {
        setResponseText("");
        await fetchTickets();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTickets = tickets.filter(
    (t) => activeTab === "ALL" || t.status === activeTab
  );

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Executive Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-5 gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Confidential Parent Desk</h1>
            <p className="text-slate-400 text-sm mt-1">
              Direct executive communications from parents bypass faculty filters.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(["ALL", "OPEN", "IN_PROGRESS", "RESOLVED"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  activeTab === tab
                    ? "bg-blue-600 border-blue-500 text-white"
                    : "bg-[#111827] border-slate-800 text-slate-400 hover:bg-slate-800"
                }`}
              >
                {tab.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Master-Detail Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
          {/* Ticket List Sidebar */}
          <div className="lg:col-span-5 bg-[#111827] border border-slate-800 rounded-xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-800 bg-[#0b0f19]/40 text-xs font-bold uppercase tracking-wider text-slate-400">
              Inquiries ({filteredTickets.length})
            </div>
            <div className="divide-y divide-slate-800/60 overflow-y-auto flex-1">
              {loading ? (
                <div className="p-6 text-center text-slate-500 text-sm">Loading tickets...</div>
              ) : filteredTickets.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-sm">No tickets found.</div>
              ) : (
                filteredTickets.map((ticket) => {
                  const isSelected = selectedTicket?.id === ticket.id;
                  return (
                    <div
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      className={`p-4 cursor-pointer transition ${
                        isSelected ? "bg-slate-800/70 border-l-4 border-l-blue-500" : "hover:bg-slate-800/30"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-white text-sm truncate max-w-[200px]">
                          {ticket.subject}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            ticket.status === "OPEN"
                              ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                              : ticket.status === "IN_PROGRESS"
                              ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          }`}
                        >
                          {ticket.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mb-2">
                        From: <span className="text-slate-200">{ticket.parent?.name || "Parent"}</span> (CNIC: {ticket.parent?.cnic})
                      </div>
                      <div className="text-xs text-slate-500 line-clamp-2">{ticket.message}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Detailed Conversation & Action Panel */}
          <div className="lg:col-span-7 bg-[#111827] border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
            {selectedTicket ? (
              <div className="space-y-6 flex-1 flex flex-col justify-between">
                <div>
                  {/* Header Meta */}
                  <div className="border-b border-slate-800 pb-4 mb-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-bold text-white">{selectedTicket.subject}</h2>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUpdateStatus("IN_PROGRESS")}
                          disabled={submitting}
                          className="px-2.5 py-1 text-xs bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded hover:bg-amber-500/20"
                        >
                          In Progress
                        </button>
                        <button
                          onClick={() => handleUpdateStatus("RESOLVED")}
                          disabled={submitting}
                          className="px-2.5 py-1 text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded hover:bg-emerald-500/20"
                        >
                          Resolve Ticket
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-slate-400 flex flex-wrap gap-4">
                      <span><strong>Parent:</strong> {selectedTicket.parent?.name}</span>
                      <span><strong>Phone:</strong> {selectedTicket.parent?.phone || "N/A"}</span>
                      {selectedTicket.parent?.studentProfile && (
                        <span>
                          <strong>Student Roll:</strong> {selectedTicket.parent.studentProfile.rollNumber} (
                          {selectedTicket.parent.studentProfile.class?.name})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Threaded Message Log */}
                  <div className="bg-[#0b0f19] border border-slate-800 rounded-lg p-4 font-mono text-xs whitespace-pre-wrap text-slate-300 max-h-[300px] overflow-y-auto">
                    {selectedTicket.message}
                  </div>
                </div>

                {/* Response Entry Box */}
                <form onSubmit={handleSendResponse} className="mt-4 space-y-3">
                  <label className="block text-xs text-slate-400 font-semibold">
                    Executive Reply / Internal Note
                  </label>
                  <textarea
                    rows={3}
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="Type executive response to be attached to parent desk thread..."
                    className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submitting || !responseText.trim()}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-lg transition disabled:opacity-50"
                    >
                      {submitting ? "Sending..." : "Append Response & Notify Parent"}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                Select a ticket from the left panel to inspect details.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
