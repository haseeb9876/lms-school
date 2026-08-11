'use client';

import { useState } from 'react';

type MvpInstallPromptProps = {
  appName?: string;
};

export default function MvpInstallPrompt({ appName = 'LMS' }: MvpInstallPromptProps) {
  const [shown, setShown] = useState(true);

  if (!shown) return null;

  return (
    <section style={{ border: '1px solid #dbeafe', borderRadius: 20, padding: '1rem', background: 'linear-gradient(135deg, #eff6ff, #f8fafc)', boxShadow: '0 14px 32px rgba(15, 23, 42, 0.08)' }}>
      <p style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#1d4ed8', fontWeight: 700, fontSize: '0.8rem' }}>MVP launch flow</p>
      <h3 style={{ margin: '0.35rem 0', fontSize: '1.25rem' }}>{appName} testing release</h3>
      <p style={{ margin: '0.2rem 0 0.8rem', color: '#475569' }}>On first access, users will be guided to install the app, log in, and test the experience for a limited period before the full public release.</p>
      <div style={{ display: 'flex', gap: '0.7rem', flexWrap: 'wrap' }}>
        <button className="primary-btn" onClick={() => setShown(false)} type="button">Continue</button>
        <a href="/login" className="secondary-btn">Open login</a>
      </div>
    </section>
  );
}
