"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, Lock, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [cnic, setCnic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cnic.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cnic }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const destination = callbackUrl || data.redirectUrl;
        router.push(destination);
        router.refresh();
      } else {
        setError(data.error || "Invalid CNIC credentials.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4 font-sans selection:bg-indigo-500 selection:text-white">
      <div className="w-full max-w-md bg-[#080d1a] border border-slate-800/90 rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 mx-auto flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-600/20">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight pt-2">Enterprise Login</h1>
          <p className="text-slate-400 text-xs">
            Enter your registered CNIC to access your portal workspace.
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-950/40 border border-rose-800/80 rounded-xl text-rose-300 text-xs text-center font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">
              Registered ID / CNIC
            </label>
            <input
              type="text"
              required
              value={cnic}
              onChange={(e) => setCnic(e.target.value)}
              placeholder="e.g. 1111111111111"
              className="w-full bg-[#030712] border border-slate-700/80 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono tracking-wider"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !cnic.trim()}
            className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-extrabold text-xs py-3.5 rounded-xl transition disabled:opacity-50 shadow-xl shadow-indigo-600/25 flex items-center justify-center gap-2"
          >
            {loading ? "Authenticating..." : "Access Secure Portal"} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="border-t border-slate-800/80 pt-4 text-center">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Principal: <code className="text-indigo-300 font-mono">1111111111111</code> | Teacher: <code className="text-indigo-300 font-mono">2222222222222</code> | Student: <code className="text-indigo-300 font-mono">3333333333333</code>
          </p>
        </div>
      </div>
    </div>
  );
}
