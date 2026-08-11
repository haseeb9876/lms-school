"use client";

import React, { useState, useEffect, useCallback } from "react";
import { printStudentReportCard, ExamSubjectResult } from "@/lib/pdf-report-card";

interface StudentGradeRow {
  studentId: string;
  rollNumber: string;
  name: string;
  fatherName: string;
  marksObtained: number;
  totalMarks: number;
  allResults: ExamSubjectResult[];
}

export default function TeacherGradesPage() {
  const [classes, setClasses] = useState<Array<{ id: string; name: string; section: string }>>([]);
  const [classId, setClassId] = useState("");
  const [term, setTerm] = useState("Mid-Term 2026");
  const [subject, setSubject] = useState("Mathematics");
  const [students, setStudents] = useState<StudentGradeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch classes
  useEffect(() => {
    async function fetchClasses() {
      try {
        const res = await fetch("/api/classes");
        const data = await res.json();
        if (res.ok && data.classes?.length > 0) {
          setClasses(data.classes);
          setClassId(data.classes[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    }
    fetchClasses();
  }, []);

  // Fetch grade roster for selected class and term
  const fetchRoster = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    setAlert(null);
    try {
      const res = await fetch(`/api/grades?classId=${classId}&term=${encodeURIComponent(term)}`);
      const data = await res.json();
      if (res.ok && data.students) {
        const formatted = data.students.map((s: any) => {
          const existingSubjectMatch = s.examResults.find((r: any) => r.subject === subject);
          return {
            studentId: s.id,
            rollNumber: s.rollNumber,
            name: s.user.name,
            fatherName: s.fatherName,
            marksObtained: existingSubjectMatch ? existingSubjectMatch.marksObtained : 0,
            totalMarks: existingSubjectMatch ? existingSubjectMatch.totalMarks : 100,
            allResults: s.examResults.map((r: any) => ({
              subject: r.subject,
              marksObtained: r.marksObtained,
              totalMarks: r.totalMarks,
            })),
          };
        });
        setStudents(formatted);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [classId, term, subject]);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  const handleMarkChange = (studentId: string, field: "marksObtained" | "totalMarks", value: number) => {
    setStudents((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, [field]: value } : s))
    );
  };

  const handleSaveGrades = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setAlert(null);

    try {
      const payload = {
        subject,
        term,
        records: students.map((s) => ({
          studentId: s.studentId,
          marksObtained: s.marksObtained,
          totalMarks: s.totalMarks,
        })),
      };

      const res = await fetch("/api/grades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setAlert({ type: "success", text: data.message });
        fetchRoster();
      } else {
        setAlert({ type: "error", text: data.error || "Failed to save marks." });
      }
    } catch (err) {
      setAlert({ type: "error", text: "Error saving exam grades." });
    } finally {
      setSaving(false);
    }
  };

  const handlePrintCard = (student: StudentGradeRow) => {
    const activeClass = classes.find((c) => c.id === classId);
    printStudentReportCard({
      studentName: student.name,
      rollNumber: student.rollNumber,
      fatherName: student.fatherName,
      className: activeClass ? `${activeClass.name}-${activeClass.section}` : "Class 10-A",
      term,
      results: student.allResults,
    });
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="border-b border-slate-800 pb-4">
          <h1 className="text-2xl font-bold text-white">Academic Gradebook & Report Cards</h1>
          <p className="text-slate-400 text-sm mt-1">
            Input exam marks by subject and generate term evaluation report cards.
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

        {/* Toolbar Controls */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Target Class</label>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
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
            <label className="block text-xs text-slate-400 mb-1">Exam Term</label>
            <select
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Mid-Term 2026">Mid-Term 2026</option>
              <option value="Final-Term 2026">Final-Term 2026</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Subject</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Mathematics">Mathematics</option>
              <option value="English">English</option>
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Computer Science">Computer Science</option>
            </select>
          </div>
        </div>

        {/* Marks Matrix Table */}
        <form onSubmit={handleSaveGrades} className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-[#1e293b]/50 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Roll No</th>
                  <th className="px-6 py-4">Student Name</th>
                  <th className="px-6 py-4">Father Name</th>
                  <th className="px-6 py-4">Obtained Marks</th>
                  <th className="px-6 py-4">Max Marks</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                      Loading gradebook...
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                      No enrolled students found.
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
                        <input
                          type="number"
                          min={0}
                          max={student.totalMarks}
                          value={student.marksObtained}
                          onChange={(e) =>
                            handleMarkChange(student.studentId, "marksObtained", Number(e.target.value))
                          }
                          className="w-24 bg-[#0b0f19] border border-slate-700 rounded p-1.5 text-xs text-white text-center font-bold"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          min={1}
                          value={student.totalMarks}
                          onChange={(e) =>
                            handleMarkChange(student.studentId, "totalMarks", Number(e.target.value))
                          }
                          className="w-24 bg-[#0b0f19] border border-slate-700 rounded p-1.5 text-xs text-slate-400 text-center"
                        />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handlePrintCard(student)}
                          className="px-3 py-1.5 text-xs bg-blue-600/20 border border-blue-500/40 text-blue-300 hover:bg-blue-600/40 rounded font-medium"
                        >
                          Print Report Card
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-slate-800 bg-[#0b0f19]/40 flex justify-end">
            <button
              type="submit"
              disabled={saving || students.length === 0}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-lg transition disabled:opacity-50"
            >
              {saving ? "Persisting Marks..." : `Save ${subject} Marks`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
