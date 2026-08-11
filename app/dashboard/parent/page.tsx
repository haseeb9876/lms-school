"use client";

import { useState } from 'react';
import RoleShell from '@/app/components/RoleShell';
import RoleGuide from '@/app/components/RoleGuide';

const initialUpdates = [
  { id: 1, title: 'Attendance update', detail: 'Ali was present today.', date: '2026-08-03' },
  { id: 2, title: 'Exam reminder', detail: 'Mid-term exams begin next week.', date: '2026-08-04' },
  { id: 3, title: 'Fee notice', detail: 'Monthly tuition is now visible in the parent account.', date: '2026-08-04' }
];

export default function ParentPage() {
  const [updates] = useState(initialUpdates);

  return (
    <main className="page-shell">
      <RoleShell title="Parent portal" subtitle="Keep parents informed with important school updates.">
        <section className="hero-card">
          <p className="eyebrow">Parent portal</p>
          <h1>Stay informed about your child</h1>
          <p className="lead">Parents can follow school announcements, attendance, academic progress, and fee updates in one secure and simple experience.</p>
        </section>

        <RoleGuide
          title="How parents stay informed"
          description="This portal keeps family communication simple and reassuring."
          bullets={['View important school updates', 'Track attendance and reminders', 'Follow results and fee history']}
        />

        <section className="dashboard-grid" style={{ marginTop: '1rem' }}>
          <section className="panel-card">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Student</p>
                <h3>Child snapshot</h3>
              </div>
              <span className="chip chip-success">On track</span>
            </div>
            <div className="timeline-list">
              <div className="list-item">
                <div>
                  <strong>Ali Khan</strong>
                  <div className="meta">Grade 9 • Section A</div>
                </div>
                <span className="chip chip-success">Present today</span>
              </div>
            </div>
          </section>

          <section className="panel-card">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Notifications</p>
                <h3>Latest updates</h3>
              </div>
            </div>
            <div className="timeline-list">
              {updates.map((item) => (
                <div key={item.id} className="list-item">
                  <div>
                    <strong>{item.title}</strong>
                    <div className="meta">{item.detail}</div>
                  </div>
                  <span className="chip chip-success">{item.date}</span>
                </div>
              ))}
            </div>
          </section>
        </section>
      </RoleShell>
    </main>
  );
}
