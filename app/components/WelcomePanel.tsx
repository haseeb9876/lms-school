'use client';

import Link from 'next/link';

type WelcomePanelProps = {
  name: string;
  schoolName?: string;
};

export default function WelcomePanel({ name, schoolName = 'Greenhill School' }: WelcomePanelProps) {
  return (
    <section style={{ borderRadius: 24, padding: '1.2rem', background: 'linear-gradient(135deg, #eff6ff 0%, #f8fbff 100%)', border: '1px solid #dbeafe', boxShadow: '0 12px 28px rgba(15, 23, 42, 0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <p style={{ margin: 0, color: '#1d4ed8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', fontSize: '0.78rem' }}>Welcome back</p>
          <h2 style={{ margin: '0.3rem 0 0.35rem', fontSize: '1.4rem' }}>{name}</h2>
          <p style={{ margin: 0, color: '#475569' }}>{schoolName} is ready for daily school operations.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <Link href="/settings" className="secondary-btn">Update branding</Link>
          <Link href="/dashboard/announcements" className="primary-btn">Post update</Link>
        </div>
      </div>
    </section>
  );
}
