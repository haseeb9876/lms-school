'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/app/components/Navbar';
import { MessageSquare, Send, Bell, CheckCircle2, AlertCircle, Phone } from 'lucide-react';

interface Log {
  id: string;
  recipient: string;
  phone: string;
  type: string;
  message: string;
  status: string;
  sentAt: string;
}

export default function NotificationsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const [form, setForm] = useState({
    recipient: '',
    phone: '',
    type: 'FEE_REMINDER',
    message: '',
  });

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setSuccessMsg('');

    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('WhatsApp/SMS Dispatch Triggered Successfully!');
        setForm({ recipient: '', phone: '', type: 'FEE_REMINDER', message: '' });
        fetchLogs();
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/60">
      <Navbar />

      <main className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Banner */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 rounded-2xl p-6 text-white shadow-xl border border-emerald-900/40 flex justify-between items-center">
          <div>
            <span className="bg-emerald-500/20 text-emerald-300 text-xs font-semibold px-3 py-1 rounded-full border border-emerald-500/30">
              Automated Communications Engine
            </span>
            <h1 className="text-2xl font-bold mt-2">WhatsApp & SMS Parent Alert Gateway</h1>
            <p className="text-xs text-slate-300 mt-1">
              Trigger automated fee reminders, daily absentee notifications, and term exam performance alerts.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Dispatch Panel */}
          <div className="md:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              Manual Broadcast Dispatch
            </h3>

            <form onSubmit={handleSend} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-600 uppercase text-[10px]">Parent / Guardian Name</label>
                <input
                  type="text"
                  placeholder="e.g. Mr. Muhammad Khan"
                  value={form.recipient}
                  onChange={(e) => setForm({ ...form, recipient: e.target.value })}
                  className="w-full mt-1 p-2.5 border border-slate-300 rounded-xl outline-none focus:border-emerald-600"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 uppercase text-[10px]">Mobile Phone No (WhatsApp)</label>
                <input
                  type="text"
                  placeholder="+92 300 1234567"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full mt-1 p-2.5 font-mono border border-slate-300 rounded-xl outline-none focus:border-emerald-600"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 uppercase text-[10px]">Notification Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full mt-1 p-2.5 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 bg-white"
                >
                  <option value="FEE_REMINDER">Pending Fee Balance Alert</option>
                  <option value="ABSENTEE">Daily Student Absentee Notice</option>
                  <option value="REPORT_CARD">Term Report Card Published</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-600 uppercase text-[10px]">Message Content</label>
                <textarea
                  rows={3}
                  placeholder="Type official notification message here..."
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full mt-1 p-2.5 border border-slate-300 rounded-xl outline-none focus:border-emerald-600"
                  required
                />
              </div>

              {successMsg && (
                <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl flex items-center gap-2 text-[11px] font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {successMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={sending}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-md"
              >
                <Send className="w-4 h-4" />
                <span>{sending ? 'Dispatching...' : 'Dispatch Notification'}</span>
              </button>
            </form>
          </div>

          {/* Audit Trail */}
          <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Bell className="w-4 h-4 text-indigo-600" />
              Live Broadcast Audit Log
            </h3>

            {loading ? (
              <div className="p-8 text-center text-slate-400">Loading audit trail...</div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No message dispatches logged yet.</div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {logs.map((log) => (
                  <div key={log.id} className="py-3 flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{log.recipient}</span>
                        <span className="text-slate-400 font-mono text-[10px]">({log.phone})</span>
                        <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded text-[9px]">
                          {log.type}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px]">{log.message}</p>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      {new Date(log.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
