"use client";

import React, { useState, useEffect } from "react";

interface Teacher {
  id: string;
  name: string;
  cnic: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  teacher?: Teacher;
}

interface ClassGrade {
  id: string;
  name: string;
  section: string;
  subjects: Subject[];
}

export default function AcademicManagementPage() {
  const [classes, setClasses] = useState<ClassGrade[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newClassName, setNewClassName] = useState("");
  const [newSection, setNewSection] = useState("A");

  const [selectedClassId, setSelectedClassId] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [assignedTeacherId, setAssignedTeacherId] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [classRes, userRes] = await Promise.all([
        fetch("/api/academic"),
        fetch("/api/users"),
      ]);

      if (classRes.ok && userRes.ok) {
        const classData = await classRes.json();
        const userData = await userRes.json();
        setClasses(classData);
        setTeachers(userData.filter((u: any) => u.role === "TEACHER"));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName) return;

    const res = await fetch("/api/academic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "CREATE_CLASS",
        className: newClassName,
        section: newSection,
      }),
    });

    if (res.ok) {
      setNewClassName("");
      fetchData();
    } else {
      alert("Failed to create class. Name might already exist.");
    }
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId || !subjectName || !subjectCode) {
      alert("Please select a class and enter subject details.");
      return;
    }

    const res = await fetch("/api/academic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "ADD_SUBJECT",
        classGradeId: selectedClassId,
        subjectName,
        subjectCode,
        teacherId: assignedTeacherId || null,
      }),
    });

    if (res.ok) {
      setSubjectName("");
      setSubjectCode("");
      setAssignedTeacherId("");
      fetchData();
    } else {
      alert("Failed to add subject.");
    }
  };

  const handleDelete = async (type: "CLASS" | "SUBJECT", id: string) => {
    if (!confirm(`Are you sure you want to delete this ${type.toLowerCase()}?`)) return;

    const res = await fetch("/api/academic", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id }),
    });

    if (res.ok) fetchData();
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 p-8 font-sans">
      <div className="mb-8 p-6 bg-[#111827] border border-slate-800 rounded-2xl shadow-sm">
        <span className="text-[10px] uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full font-semibold">
          Phase 3 Architecture
        </span>
        <h1 className="text-3xl font-bold mt-3">Class, Section & Subject Architecture</h1>
        <p className="text-slate-400 text-xs mt-1">
          Configure classes, map curriculum subjects, and assign faculty members to subjects.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Management Controls */}
        <div className="lg:col-span-5 space-y-6">
          {/* Create Class Form */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6">
            <h2 className="text-sm font-bold mb-4 text-indigo-400">1. Add New Class / Section</h2>
            <form onSubmit={handleCreateClass} className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Class Name</label>
                <input
                  type="text"
                  placeholder="e.g. Class 9 or Matric"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full bg-[#0b0f19] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Section</label>
                <input
                  type="text"
                  placeholder="e.g. A, B, or Rose"
                  value={newSection}
                  onChange={(e) => setNewSection(e.target.value)}
                  className="w-full bg-[#0b0f19] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 rounded-xl text-xs"
              >
                Create Class Grade
              </button>
            </form>
          </div>

          {/* Add Subject Form */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6">
            <h2 className="text-sm font-bold mb-4 text-emerald-400">2. Assign Subject & Faculty</h2>
            <form onSubmit={handleAddSubject} className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Select Target Class</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full bg-[#0b0f19] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  required
                >
                  <option value="">-- Choose Class --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Sec {c.section})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Subject Name</label>
                <input
                  type="text"
                  placeholder="e.g. Mathematics"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  className="w-full bg-[#0b0f19] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Subject Code</label>
                <input
                  type="text"
                  placeholder="e.g. MATH-09"
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value)}
                  className="w-full bg-[#0b0f19] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Assign Subject Teacher</label>
                <select
                  value={assignedTeacherId}
                  onChange={(e) => setAssignedTeacherId(e.target.value)}
                  className="w-full bg-[#0b0f19] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="">-- Unassigned --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.cnic})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded-xl text-xs"
              >
                Map Subject to Class
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Academic Hierarchy Display */}
        <div className="lg:col-span-7">
          <h2 className="text-sm font-bold mb-4 text-slate-300">Active Curriculum Structure</h2>

          {loading ? (
            <div className="p-8 text-center text-slate-500 text-xs">Loading structure...</div>
          ) : classes.length === 0 ? (
            <div className="p-8 text-center bg-[#111827] border border-slate-800 rounded-2xl text-slate-500 text-xs">
              No classes created yet. Use the control form to establish class grades.
            </div>
          ) : (
            <div className="space-y-4">
              {classes.map((cls) => (
                <div key={cls.id} className="bg-[#111827] border border-slate-800 rounded-2xl p-5">
                  <div className="flex justify-between items-center mb-3 pb-3 border-b border-slate-800">
                    <div>
                      <h3 className="font-bold text-base text-white">{cls.name}</h3>
                      <span className="text-[11px] text-slate-400">Section {cls.section}</span>
                    </div>
                    <button
                      onClick={() => handleDelete("CLASS", cls.id)}
                      className="text-xs text-red-400 hover:underline"
                    >
                      Delete Class
                    </button>
                  </div>

                  {cls.subjects.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No subjects assigned to this class.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {cls.subjects.map((sub) => (
                        <div
                          key={sub.id}
                          className="bg-[#0b0f19] border border-slate-800/80 p-3 rounded-xl flex justify-between items-start"
                        >
                          <div>
                            <div className="font-semibold text-xs text-indigo-300">{sub.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{sub.code}</div>
                            <div className="text-[10px] text-slate-400 mt-1">
                              Teacher:{" "}
                              <span className="text-emerald-400">
                                {sub.teacher ? sub.teacher.name : "Unassigned"}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDelete("SUBJECT", sub.id)}
                            className="text-slate-500 hover:text-red-400 text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
