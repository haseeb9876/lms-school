'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, CheckCircle, Clock, UploadCloud, FileText, Award, MessageSquare } from 'lucide-react';

interface Submission {
  id: string;
  marks?: number;
  feedback?: string;
  submittedAt: string;
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  class: { name: string };
  submissions: Submission[];
}

export default function StudentAssignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const fetchAssignments = async () => {
    try {
      const res = await fetch('/api/assignments');
      const data = await res.json();
      if (data.success) {
        setAssignments(data.assignments);
      }
    } catch (err) {
      console.error('Failed to load assignments', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleHomeworkSubmit = async (assignmentId: string) => {
    setSubmittingId(assignmentId);
    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId,
          fileUrl: 'https://storage.greenhill.edu.pk/submissions/math-hw1.pdf',
        }),
      });

      if (res.ok) {
        await fetchAssignments();
      }
    } catch (err) {
      console.error('Submission failed', err);
    } finally {
      setSubmittingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 font-medium bg-white rounded-2xl border border-slate-200">
        Loading active assignments...
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
      <div className="flex justify-between items-center pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            Coursework & Assignments
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Track, submit, and view grades for assigned coursework.</p>
        </div>
        <span className="bg-indigo-50 text-indigo-700 font-semibold px-3 py-1 rounded-full text-xs border border-indigo-100">
          {assignments.length} Total Assigned
        </span>
      </div>

      <div className="grid gap-4">
        {assignments.map((item) => {
          const submission = item.submissions && item.submissions.length > 0 ? item.submissions[0] : null;
          const isSubmitted = !!submission;
          const isGraded = submission && submission.marks !== null && submission.marks !== undefined;
          const formattedDate = new Date(item.dueDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });

          return (
            <div
              key={item.id}
              className="p-5 border border-slate-200/80 rounded-xl bg-slate-50/50 space-y-4"
            >
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div className="space-y-2 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded">
                      {item.class.name}
                    </span>
                    <h3 className="font-bold text-slate-800 text-sm">{item.title}</h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Due: {formattedDate}
                    </span>
                    {isSubmitted && (
                      <span className="flex items-center gap-1 text-indigo-600 font-medium">
                        <FileText className="w-3.5 h-3.5" />
                        math-hw1.pdf
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  {isSubmitted ? (
                    <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs bg-emerald-50 px-4 py-2.5 rounded-xl border border-emerald-200">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span>Submitted</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleHomeworkSubmit(item.id)}
                      disabled={submittingId === item.id}
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      <UploadCloud className="w-4 h-4" />
                      {submittingId === item.id ? 'Uploading...' : 'Upload Work'}
                    </button>
                  )}
                </div>
              </div>

              {/* Display Marks & Feedback if Graded */}
              {isGraded && (
                <div className="mt-3 p-4 bg-indigo-50/60 border border-indigo-100 rounded-lg flex flex-col md:flex-row justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-600" />
                    <span className="font-semibold text-slate-700">Grade Recorded:</span>
                    <span className="font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                      {submission.marks} / 100
                    </span>
                  </div>
                  {submission.feedback && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Feedback: <strong className="text-slate-800">{submission.feedback}</strong></span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
