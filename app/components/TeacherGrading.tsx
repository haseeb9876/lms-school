'use client';

import React, { useState, useEffect } from 'react';
import { Award, CheckCircle2, ExternalLink, Save, UserCheck } from 'lucide-react';

interface Submission {
  id: string;
  fileUrl: string;
  marks?: number;
  feedback?: string;
  submittedAt: string;
  assignment: { title: string };
  student: { admissionNo: string; user: { name: string } };
}

export default function TeacherGrading() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [gradingData, setGradingData] = useState<{ [key: string]: { marks: string; feedback: string } }>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchSubmissions = async () => {
    try {
      const res = await fetch('/api/submissions');
      const data = await res.json();
      if (data.success) {
        setSubmissions(data.submissions);
        
        const initialFormState: { [key: string]: { marks: string; feedback: string } } = {};
        data.submissions.forEach((item: Submission) => {
          initialFormState[item.id] = {
            marks: item.marks !== undefined && item.marks !== null ? String(item.marks) : '',
            feedback: item.feedback || '',
          };
        });
        setGradingData(initialFormState);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const handleSaveGrade = async (submissionId: string) => {
    setSavingId(submissionId);
    try {
      const payload = gradingData[submissionId];
      const res = await fetch('/api/submissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId,
          marks: payload.marks,
          feedback: payload.feedback,
        }),
      });

      if (res.ok) {
        await fetchSubmissions();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-medium bg-white rounded-2xl border border-slate-200">Loading submitted homework for grading...</div>;
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
      <div className="flex justify-between items-center pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-600" />
            Teacher Gradebook & Submissions Review
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Evaluate submitted assignments and record student grades.</p>
        </div>
        <span className="bg-emerald-50 text-emerald-700 font-semibold px-3 py-1 rounded-full text-xs border border-emerald-100">
          {submissions.length} Active Submissions
        </span>
      </div>

      <div className="grid gap-6">
        {submissions.length === 0 ? (
          <div className="text-center p-6 text-slate-500 text-xs">No homework submissions found to grade.</div>
        ) : (
          submissions.map((sub) => {
            const formData = gradingData[sub.id] || { marks: '', feedback: '' };
            const isGraded = sub.marks !== null && sub.marks !== undefined;

            return (
              <div key={sub.id} className="p-5 border border-slate-200 rounded-xl bg-slate-50/50 space-y-4">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-2 pb-3 border-b border-slate-200/60">
                  <div>
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-indigo-600" />
                      <h3 className="font-bold text-slate-800 text-sm">{sub.student.user.name}</h3>
                      <span className="text-xs font-mono bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                        {sub.student.admissionNo}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Assignment: <strong className="text-slate-700">{sub.assignment.title}</strong></p>
                  </div>

                  <a
                    href={sub.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 w-fit"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> View Submitted Document
                  </a>
                </div>

                <div className="grid md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Score / Marks (out of 100)</label>
                    <input
                      type="number"
                      placeholder="e.g. 95"
                      value={formData.marks}
                      onChange={(e) =>
                        setGradingData({
                          ...gradingData,
                          [sub.id]: { ...formData, marks: e.target.value },
                        })
                      }
                      className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Teacher Feedback</label>
                    <input
                      type="text"
                      placeholder="e.g. Excellent work on step 3!"
                      value={formData.feedback}
                      onChange={(e) =>
                        setGradingData({
                          ...gradingData,
                          [sub.id]: { ...formData, feedback: e.target.value },
                        })
                      }
                      className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <button
                      onClick={() => handleSaveGrade(sub.id)}
                      disabled={savingId === sub.id}
                      className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2.5 px-4 rounded-lg transition shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      {isGraded ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                      {savingId === sub.id ? 'Saving...' : isGraded ? 'Update Grade' : 'Submit Grade'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
