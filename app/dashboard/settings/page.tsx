'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/app/components/Navbar';
import { Building2, Save, CreditCard, ShieldCheck, Phone, MapPin, CheckCircle2 } from 'lucide-react';

export default function SettingsPage() {
  const [form, setForm] = useState({
    schoolName: '',
    tagline: '',
    bankName: '',
    accountNumber: '',
    accountTitle: '',
    contactPhone: '',
    address: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.success && data.settings) {
          setForm(data.settings);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/60">
      <Navbar />

      <main className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Banner */}
        <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-slate-800 flex justify-between items-center">
          <div>
            <span className="bg-indigo-500/20 text-indigo-300 text-xs font-semibold px-3 py-1 rounded-full border border-indigo-500/30">
              White-Label Engine
            </span>
            <h1 className="text-2xl font-bold mt-2">Institutional Branding & Bank Setup</h1>
            <p className="text-xs text-slate-300 mt-1">
              Customize school headers, official bank account numbers for fee challans, and contact info.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
            Fetching institutional configurations...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Branding Block */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Building2 className="w-4 h-4 text-indigo-600" />
                School Identity & Profile
              </h3>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase">School Name</label>
                  <input
                    type="text"
                    value={form.schoolName}
                    onChange={(e) => setForm({ ...form, schoolName: e.target.value })}
                    className="w-full mt-1 p-2.5 text-xs border border-slate-300 rounded-xl outline-none focus:border-indigo-600"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase">Institutional Tagline</label>
                  <input
                    type="text"
                    value={form.tagline}
                    onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                    className="w-full mt-1 p-2.5 text-xs border border-slate-300 rounded-xl outline-none focus:border-indigo-600"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Financial Bank Details Block */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                Bank Collection Account (Appears on Printable Fee Challans)
              </h3>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase">Bank Name</label>
                  <input
                    type="text"
                    value={form.bankName}
                    onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                    className="w-full mt-1 p-2.5 text-xs border border-slate-300 rounded-xl outline-none focus:border-indigo-600"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase">Account Title</label>
                  <input
                    type="text"
                    value={form.accountTitle}
                    onChange={(e) => setForm({ ...form, accountTitle: e.target.value })}
                    className="w-full mt-1 p-2.5 text-xs border border-slate-300 rounded-xl outline-none focus:border-indigo-600"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase">IBAN / Account No</label>
                  <input
                    type="text"
                    value={form.accountNumber}
                    onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                    className="w-full mt-1 p-2.5 text-xs font-mono border border-slate-300 rounded-xl outline-none focus:border-indigo-600"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Official Contact Block */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Phone className="w-4 h-4 text-purple-600" />
                Contact & Campus Address
              </h3>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase">Official Phone Number</label>
                  <input
                    type="text"
                    value={form.contactPhone}
                    onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                    className="w-full mt-1 p-2.5 text-xs border border-slate-300 rounded-xl outline-none focus:border-indigo-600"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase">Campus Physical Address</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full mt-1 p-2.5 text-xs border border-slate-300 rounded-xl outline-none focus:border-indigo-600"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Submit Action */}
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200">
              {savedSuccess ? (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Branding Settings Updated Successfully!
                </span>
              ) : (
                <span className="text-xs text-slate-400">All changes immediately reflect on printed fee vouchers and transcripts.</span>
              )}

              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-lg transition"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
