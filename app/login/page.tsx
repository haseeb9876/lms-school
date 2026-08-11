"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";

function LoginForm() {
  const router = useRouter();

  const [cnic, setCnic] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
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
        throw new Error(data.error || `HTTP ${res.status}: Failed to authenticate`);
      }

      // Dynamic Role-Based Routing
      const role = data.user?.role?.toUpperCase();

      if (role === "STUDENT") {
        router.push("/dashboard/student");
      } else if (role === "TEACHER") {
        router.push("/dashboard/teacher");
      } else if (role === "PARENT") {
        router.push("/dashboard/parent");
      } else if (role === "PRINCIPAL") {
        router.push("/dashboard/principal");
      } else {
        router.push("/dashboard");
      }

      router.refresh();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl">
      <h1 className="text-2xl font-bold text-center mb-2 text-white">Sign In</h1>
      <p className="text-sm text-slate-400 text-center mb-6">
        Enter your CNIC number to access your LMS portal
      </p>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-950/80 border border-red-800 text-red-200 text-sm break-words">
          <strong>Error details:</strong> {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs uppercase text-slate-400 font-semibold mb-1">
            CNIC Number
          </label>
          <input
            type="text"
            required
            value={cnic}
            onChange={(e) => setCnic(e.target.value)}
            placeholder="61101-1111111-1"
            className="w-full px-4 py-2.5 rounded bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 rounded font-medium transition duration-200 disabled:opacity-50 text-white"
        >
          {loading ? "Authenticating..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-4">
      <Suspense fallback={<div className="text-slate-400">Loading portal...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
