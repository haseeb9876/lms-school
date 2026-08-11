"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { UserPlus, Search, ArrowLeft, Trash2, Filter, Plus, Edit2, X, Check } from "lucide-react";

export default function UserDirectoryPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [classFilter, setClassFilter] = useState("ALL");

  // Registration Form State
  const [name, setName] = useState("");
  const [cnic, setCnic] = useState("");
  const [role, setRole] = useState("STUDENT");
  const [phone, setPhone] = useState("");

  // Student specific
  const [selectedClassId, setSelectedClassId] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [fatherCnic, setFatherCnic] = useState("");
  const [rollNumber, setRollNumber] = useState("");

  // Teacher specific (Multi-Subject/Class workload)
  const [teacherClassId, setTeacherClassId] = useState("");
  const [teacherSubject, setTeacherSubject] = useState("Mathematics");
  const [teacherAssignments, setTeacherAssignments] = useState<Array<{ classId: string; subject: string; className: string }>>([]);

  // Edit Modal State
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editCnic, setEditCnic] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState("STUDENT");
  const [editClassId, setEditClassId] = useState("");
  const [editFatherName, setEditFatherName] = useState("");
  const [editFatherCnic, setEditFatherCnic] = useState("");
  const [editRollNumber, setEditRollNumber] = useState("");
  const [editTeacherAssignments, setEditTeacherAssignments] = useState<Array<{ classId: string; subject: string; className: string }>>([]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`/api/users?search=${encodeURIComponent(searchQuery)}&role=${roleFilter}&classId=${classFilter}`);
      const data = await res.json();
      if (res.ok) setUsers(data.users || []);
    } catch (e) {
      console.error(e);
    }
  }, [searchQuery, roleFilter, classFilter]);

  useEffect(() => {
    async function fetchClasses() {
      try {
        const res = await fetch("/api/classes");
        const data = await res.json();
        if (res.ok && data.classes?.length > 0) {
          setClasses(data.classes);
          setSelectedClassId(data.classes[0].id);
          setTeacherClassId(data.classes[0].id);
        }
      } catch (e) {
        console.error(e);
      }
    }
    fetchClasses();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleAddTeacherAssignment = () => {
    if (!teacherClassId || !teacherSubject) return;
    const targetClass = classes.find((c) => c.id === teacherClassId);
    if (!targetClass) return;

    setTeacherAssignments((prev) => [
      ...prev,
      { classId: teacherClassId, subject: teacherSubject, className: `${targetClass.name} - ${targetClass.section}` },
    ]);
  };

  const handleAddEditTeacherAssignment = () => {
    if (!teacherClassId || !teacherSubject) return;
    const targetClass = classes.find((c) => c.id === teacherClassId);
    if (!targetClass) return;

    setEditTeacherAssignments((prev) => [
      ...prev,
      { classId: teacherClassId, subject: teacherSubject, className: `${targetClass.name} - ${targetClass.section}` },
    ]);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const payload = {
        name,
        cnic,
        role,
        phone,
        classId: selectedClassId,
        fatherName,
        fatherCnic,
        rollNumber,
        classAssignments: teacherAssignments,
      };

      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "User account registered successfully!" });
        setName("");
        setCnic("");
        setPhone("");
        setFatherName("");
        setFatherCnic("");
        setRollNumber("");
        setTeacherAssignments([]);
        fetchUsers();
      } else {
        setMessage({ type: "error", text: data.error || "Registration failed." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Network error." });
    } finally {
      setLoading(false);
    }
  };

  // Open Edit Modal with existing data
  const handleOpenEdit = (user: any) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditCnic(user.cnic);
    setEditPhone(user.phone || "");
    setEditRole(user.role);

    if (user.role === "STUDENT" && user.studentProfile) {
      setEditClassId(user.studentProfile.classId || (classes[0]?.id || ""));
      setEditFatherName(user.studentProfile.fatherName || "");
      setEditFatherCnic(user.studentProfile.fatherCnic || "");
      setEditRollNumber(user.studentProfile.rollNumber || "");
    }

    if (user.role === "TEACHER" && user.teacherAssignments) {
      const existing = user.teacherAssignments.map((a: any) => ({
        classId: a.classId,
        subject: a.subject,
        className: `${a.class?.name} - ${a.class?.section}`,
      }));
      setEditTeacherAssignments(existing);
    }
  };

  // Submit Edit Form
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setLoading(true);

    try {
      const payload = {
        id: editingUser.id,
        name: editName,
        cnic: editCnic,
        phone: editPhone,
        role: editRole,
        classId: editClassId,
        fatherName: editFatherName,
        fatherCnic: editFatherCnic,
        rollNumber: editRollNumber,
        classAssignments: editTeacherAssignments,
      };

      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setMessage({ type: "success", text: `User details updated for ${editName}` });
        setEditingUser(null);
        fetchUsers();
      } else {
        setMessage({ type: "error", text: "Failed to update user." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Network error updating user." });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete ${userName}?`)) return;

    try {
      const res = await fetch(`/api/users?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setMessage({ type: "success", text: `User ${userName} deleted.` });
        fetchUsers();
      }
    } catch (e) {
      setMessage({ type: "error", text: "Error deleting user." });
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 p-8 space-y-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="space-y-1 border-b border-slate-800 pb-5">
          <Link href="/dashboard/principal" className="inline-flex items-center gap-2 text-xs font-bold text-blue-400 hover:underline mb-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Executive Desk
          </Link>
          <h1 className="text-2xl font-black text-white tracking-tight">Institutional User Management & Class Reassignment</h1>
          <p className="text-slate-400 text-xs">Register users, reassign classes at year-end, update teacher workloads, and edit profile details.</p>
        </div>

        {message && (
          <div className={`p-4 rounded-xl border text-xs font-semibold ${
            message.type === "success" ? "bg-emerald-950/40 border-emerald-800 text-emerald-300" : "bg-rose-950/40 border-rose-800 text-rose-300"
          }`}>
            {message.text}
          </div>
        )}

        {/* User Registration Form */}
        <form onSubmit={handleCreateUser} className="bg-[#090d16] border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Register New Account</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full Name"
                className="w-full bg-[#030712] border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">CNIC Identifier</label>
              <input
                type="text"
                required
                value={cnic}
                onChange={(e) => setCnic(e.target.value)}
                placeholder="CNIC Number"
                className="w-full bg-[#030712] border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-[#030712] border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="STUDENT">STUDENT</option>
                <option value="TEACHER">TEACHER</option>
                <option value="PRINCIPAL">PRINCIPAL</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="03001234567"
                className="w-full bg-[#030712] border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Teacher Workload Allocation */}
          {role === "TEACHER" && (
            <div className="bg-[#030712] border border-slate-800 rounded-xl p-4 space-y-3">
              <label className="block text-xs font-bold text-indigo-400 uppercase tracking-wider">
                Assign Teacher Subject Workload (Multi-Class)
              </label>
              <div className="flex flex-col md:flex-row gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-[11px] text-slate-400 mb-1">Select Class Section</label>
                  <select
                    value={teacherClassId}
                    onChange={(e) => setTeacherClassId(e.target.value)}
                    className="w-full bg-[#090d16] border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} - Section {c.section}</option>
                    ))}
                  </select>
                </div>

                <div className="flex-1">
                  <label className="block text-[11px] text-slate-400 mb-1">Teaching Subject</label>
                  <select
                    value={teacherSubject}
                    onChange={(e) => setTeacherSubject(e.target.value)}
                    className="w-full bg-[#090d16] border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                  >
                    <option value="Mathematics">Mathematics</option>
                    <option value="English">English</option>
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Urdu">Urdu</option>
                    <option value="Islamiat">Islamiat</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleAddTeacherAssignment}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Add Assignment
                </button>
              </div>

              {teacherAssignments.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {teacherAssignments.map((a, idx) => (
                    <span key={idx} className="px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
                      {a.className} ({a.subject})
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Student Details */}
          {role === "STUDENT" && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2 border-t border-slate-800/60">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Assign Class</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full bg-[#030712] border border-slate-700 rounded-xl p-3 text-xs text-white"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} - Section {c.section}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Father Name</label>
                <input
                  type="text"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  placeholder="Father Name"
                  className="w-full bg-[#030712] border border-slate-700 rounded-xl p-3 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Father CNIC</label>
                <input
                  type="text"
                  value={fatherCnic}
                  onChange={(e) => setFatherCnic(e.target.value)}
                  placeholder="Father CNIC"
                  className="w-full bg-[#030712] border border-slate-700 rounded-xl p-3 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Roll Number</label>
                <input
                  type="text"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  placeholder="e.g. 10A-05"
                  className="w-full bg-[#030712] border border-slate-700 rounded-xl p-3 text-xs text-white font-mono"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-blue-600/20 flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" /> Complete Registration
            </button>
          </div>
        </form>

        {/* Directory Table with Search, Filter & EDIT Action */}
        <div className="bg-[#090d16] border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-4 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Name or CNIC..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#030712] border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-[#030712] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="ALL">All Roles</option>
                <option value="PRINCIPAL">PRINCIPAL</option>
                <option value="TEACHER">TEACHER</option>
                <option value="STUDENT">STUDENT</option>
              </select>

              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="bg-[#030712] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="ALL">All Classes (PG-10)</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} - {c.section}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#0f172a] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">CNIC</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Assigned Workload / Class</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {users.map((u) => {
                  let assignedText = "N/A";
                  if (u.role === "TEACHER" && u.teacherAssignments?.length > 0) {
                    assignedText = u.teacherAssignments.map((a: any) => `${a.class?.name}-${a.class?.section} (${a.subject})`).join(", ");
                  } else if (u.role === "STUDENT" && u.studentProfile?.class) {
                    assignedText = `${u.studentProfile.class.name} - ${u.studentProfile.class.section}`;
                  }

                  return (
                    <tr key={u.id} className="hover:bg-slate-800/30 transition">
                      <td className="px-6 py-4 font-sans font-bold text-white">{u.name}</td>
                      <td className="px-6 py-4 text-slate-400">{u.cnic}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded text-[10px] font-bold border ${
                          u.role === "PRINCIPAL" ? "bg-purple-500/10 border-purple-500/30 text-purple-400" :
                          u.role === "TEACHER" ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" :
                          "bg-blue-500/10 border-blue-500/30 text-blue-400"
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-sans font-semibold text-emerald-400 max-w-xs truncate">{assignedText}</td>
                      <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                        {/* EDIT BUTTON */}
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg transition"
                          title="Edit User / Reassign Class"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {/* DELETE BUTTON */}
                        <button
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg transition"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* EDIT USER & REASSIGN CLASS MODAL */}
        {editingUser && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#090d16] border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-blue-400" /> Edit User Profile & Class Reassignment
                </h3>
                <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-[#030712] border border-slate-700 rounded-xl p-3 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">CNIC Identifier</label>
                    <input
                      type="text"
                      required
                      value={editCnic}
                      onChange={(e) => setEditCnic(e.target.value)}
                      className="w-full bg-[#030712] border border-slate-700 rounded-xl p-3 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                {/* STUDENT CLASS REASSIGNMENT */}
                {editRole === "STUDENT" && (
                  <div className="bg-[#030712] border border-slate-800 p-4 rounded-xl space-y-3">
                    <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      Reassign Student Class (Year Promotion)
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Target Class</label>
                        <select
                          value={editClassId}
                          onChange={(e) => setEditClassId(e.target.value)}
                          className="w-full bg-[#090d16] border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                        >
                          {classes.map((c) => (
                            <option key={c.id} value={c.id}>{c.name} - Section {c.section}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Roll Number</label>
                        <input
                          type="text"
                          value={editRollNumber}
                          onChange={(e) => setEditRollNumber(e.target.value)}
                          className="w-full bg-[#090d16] border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* TEACHER WORKLOAD REASSIGNMENT */}
                {editRole === "TEACHER" && (
                  <div className="bg-[#030712] border border-slate-800 p-4 rounded-xl space-y-3">
                    <label className="block text-xs font-bold text-indigo-400 uppercase tracking-wider">
                      Reassign Teacher Workload (Classes & Subjects)
                    </label>

                    <div className="flex gap-2">
                      <select
                        value={teacherClassId}
                        onChange={(e) => setTeacherClassId(e.target.value)}
                        className="bg-[#090d16] border border-slate-700 rounded-xl p-2 text-xs text-white flex-1"
                      >
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>{c.name} - {c.section}</option>
                        ))}
                      </select>

                      <select
                        value={teacherSubject}
                        onChange={(e) => setTeacherSubject(e.target.value)}
                        className="bg-[#090d16] border border-slate-700 rounded-xl p-2 text-xs text-white flex-1"
                      >
                        <option value="Mathematics">Mathematics</option>
                        <option value="English">English</option>
                        <option value="Physics">Physics</option>
                        <option value="Chemistry">Chemistry</option>
                        <option value="Computer Science">Computer Science</option>
                      </select>

                      <button
                        type="button"
                        onClick={handleAddEditTeacherAssignment}
                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl"
                      >
                        Add
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      {editTeacherAssignments.map((a, idx) => (
                        <span key={idx} className="px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold flex items-center gap-2">
                          {a.className} ({a.subject})
                          <button
                            type="button"
                            onClick={() => setEditTeacherAssignments((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-rose-400 hover:text-rose-300"
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/20 flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" /> Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
