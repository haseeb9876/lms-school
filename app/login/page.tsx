"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";

  const [cnic, setCnic] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cnic }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      router.push(redirect);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 space-y-6 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 shadow-2xl">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-white">Sign In</h1>
        <p className="text-sm text-slate-400">Enter your CNIC number to access your LMS portal</p>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-400 bg-red-950/50 border border-red-800/50 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="cnic" className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1">
            CNIC Number
          </label>
          <input
            id="cnic"
            type="text"
            placeholder="e.g. 61101-1234567-1"
            value={cnic}
            onChange={(e) => setCnic(e.target.value)}
            required
            className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-lg shadow-lg shadow-blue-600/20 transition-all"
        >
          {loading ? "Authenticating..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4">
      <Suspense fallback={
        <div className="text-center text-slate-400 text-sm font-mono">
          Loading portal...
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
