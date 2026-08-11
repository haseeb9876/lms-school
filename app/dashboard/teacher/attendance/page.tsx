"use client";

import React, { useState, useEffect, useCallback } from "react";

interface StudentRecord {
  studentId: string;
  rollNumber: string;
  name: string;
  fatherName: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "LEAVE";
  recorded: boolean;
}

export default function BatchAttendancePage() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [classId, setClassId] = useState<string>(""); 
  const [classes, setClasses] = useState<Array<{ id: string; name: string; section: string }>>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch classes on load
  useEffect(() => {
    async function fetchClasses() {
      try {
        const res = await fetch("/api/classes");
        if (res.ok) {
          const data = await res.json();
          setClasses(data.classes || []);
          if (data.classes?.length > 0) setClassId(data.classes[0].id);
        }
      } catch (e) {
        // Fallback for initial seed/testing if /api/classes isn't wired yet
        console.log("No dynamic classes endpoint found, using active selection.");
      }
    }
    fetchClasses();
  }, []);

  // Fetch attendance list when date or classId changes
  const fetchAttendanceList = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/attendance?classId=${classId}&date=${selectedDate}`);
      const data = await res.json();
      if (res.ok) {
        setStudents(data.students || []);
      } else {
        setMessage({ type: "error", text: data.error || "Failed to load roster" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Network error loading attendance roster" });
    } finally {
      setLoading(false);
    }
  }, [classId, selectedDate]);

  useEffect(() => {
    fetchAttendanceList();
  }, [fetchAttendanceList]);

  // Bulk set status for all students
  const markAllStatus = (status: "PRESENT" | "ABSENT") => {
    setStudents((prev) => prev.map((s) => ({ ...s, status })));
  };

  // Toggle individual student status
  const handleStatusChange = (
    studentId: string,
    status: "PRESENT" | "ABSENT" | "LATE" | "LEAVE"
  ) => {
    setStudents((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, status } : s))
    );
  };

  // Submit batch payload
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const payload = {
        classId,
        date: selectedDate,
        records: students.map((s) => ({
          studentId: s.studentId,
          status: s.status,
        })),
      };

      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "Attendance saved and persisted successfully!" });
        fetchAttendanceList();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to save attendance" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Error submitting attendance data" });
    } finally {
      setSaving(false);
    }
  };

  // Live Summary Stats
  const presentCount = students.filter((s) => s.status === "PRESENT").length;
  const absentCount = students.filter((s) => s.status === "ABSENT").length;
  const leaveCount = students.filter((s) => s.status === "LEAVE" || s.status === "LATE").length;

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Daily Attendance Logger</h1>
            <p className="text-slate-400 text-sm mt-1">
              Select class and date to take or update mass student attendance.
            </p>
          </div>

          {/* Quick Stats Pills */}
          <div className="flex items-center gap-3">
            <span className="px-3 py-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              Present: {presentCount}
            </span>
            <span className="px-3 py-1.5 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
              Absent: {absentCount}
            </span>
            <span className="px-3 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
              Late/Leave: {leaveCount}
            </span>
          </div>
        </div>

        {/* System Alert Notification */}
        {message && (
          <div
            className={`p-4 rounded-lg border text-sm font-medium ${
              message.type === "success"
                ? "bg-emerald-950/40 border-emerald-800 text-emerald-300"
                : "bg-rose-950/40 border-rose-800 text-rose-300"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Controls Toolbar */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Select Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-[#0b0f19] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Target Class</label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="bg-[#0b0f19] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {classes.length > 0 ? (
                  classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} - {c.section}
                    </option>
                  ))
                ) : (
                  <option value="">Default Class Roster</option>
                )}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => markAllStatus("PRESENT")}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-white rounded-lg transition"
            >
              Mark All Present
            </button>
            <button
              type="button"
              onClick={() => markAllStatus("ABSENT")}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-rose-300 rounded-lg transition"
            >
              Mark All Absent
            </button>
          </div>
        </div>

        {/* Attendance Matrix Table */}
        <form onSubmit={handleSubmit} className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-[#1e293b]/50 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Roll No</th>
                  <th className="px-6 py-4">Student Name</th>
                  <th className="px-6 py-4">Father Name</th>
                  <th className="px-6 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                      Loading class roster...
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                      No enrolled students found for the selected class.
                    </td>
                  </tr>
                ) : (
                  students.map((student) => (
                    <tr key={student.studentId} className="hover:bg-slate-800/30 transition">
                      <td className="px-6 py-4 font-mono text-slate-400 font-semibold">
                        {student.rollNumber}
                      </td>
                      <td className="px-6 py-4 font-medium text-white">{student.name}</td>
                      <td className="px-6 py-4 text-slate-400">{student.fatherName}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {(["PRESENT", "ABSENT", "LATE", "LEAVE"] as const).map((status) => {
                            const isSelected = student.status === status;
                            let activeClass = "";
                            if (isSelected) {
                              if (status === "PRESENT") activeClass = "bg-emerald-600 text-white font-bold";
                              if (status === "ABSENT") activeClass = "bg-rose-600 text-white font-bold";
                              if (status === "LATE") activeClass = "bg-amber-600 text-white font-bold";
                              if (status === "LEAVE") activeClass = "bg-blue-600 text-white font-bold";
                            } else {
                              activeClass = "bg-[#0b0f19] text-slate-400 hover:bg-slate-800 border-slate-700";
                            }

                            return (
                              <button
                                key={status}
                                type="button"
                                onClick={() => handleStatusChange(student.studentId, status)}
                                className={`px-3 py-1.5 rounded-md text-xs border transition ${activeClass}`}
                              >
                                {status}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Action Footer */}
          <div className="p-4 border-t border-slate-800 bg-[#0b0f19]/40 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              {students.length} Total Records Ready
            </span>
            <button
              type="submit"
              disabled={saving || students.length === 0}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-sm rounded-lg transition shadow-lg shadow-blue-600/20"
            >
              {saving ? "Saving Records..." : "Save Batch Attendance"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
