'use client';

import { useMemo } from 'react';

type BrandPreviewProps = {
  name: string;
  heroTitle: string;
  heroSubtitle: string;
  successStories: string;
  primaryColor: string;
  secondaryColor: string;
};

export default function BrandPreview({ name, heroTitle, heroSubtitle, successStories, primaryColor, secondaryColor }: BrandPreviewProps) {
  const accentStyle = useMemo(() => ({ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }), [primaryColor, secondaryColor]);

  return (
    <section style={{ borderRadius: 24, overflow: 'hidden', border: '1px solid #dbeafe', boxShadow: '0 18px 40px rgba(15, 23, 42, 0.08)' }}>
      <div style={{ ...accentStyle, padding: '1.4rem 1.2rem', color: 'white' }}>
        <p style={{ margin: 0, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '0.8rem' }}>School portal preview</p>
        <h2 style={{ margin: '0.35rem 0', fontSize: '1.7rem' }}>{name}</h2>
        <p style={{ margin: 0, opacity: 0.95 }}>{heroTitle}</p>
      </div>
      <div style={{ padding: '1.2rem', background: '#ffffff' }}>
        <p style={{ color: '#475569', marginTop: 0 }}>{heroSubtitle}</p>
        <div style={{ borderRadius: 14, background: '#f8fafc', padding: '1rem', border: '1px solid #e2e8f0' }}>
          <strong>Success stories</strong>
          <p style={{ color: '#64748b', marginBottom: 0 }}>{successStories}</p>
        </div>
      </div>
    </section>
  );
}
