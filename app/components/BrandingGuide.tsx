'use client';

type BrandingGuideProps = {
  title?: string;
  description?: string;
};

export default function BrandingGuide({ title = 'Make the school feel familiar', description = 'Add the school name, message, colors, and contact details so the portal feels welcoming and professional.' }: BrandingGuideProps) {
  return (
    <section style={{ borderRadius: 18, padding: '1rem', background: '#f8fbff', border: '1px solid #dbeafe' }}>
      <h3 style={{ marginTop: 0, marginBottom: '0.35rem' }}>{title}</h3>
      <p style={{ margin: 0, color: '#475569', lineHeight: 1.6 }}>{description}</p>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
        <span style={{ background: '#eff6ff', color: '#1d4ed8', borderRadius: 999, padding: '0.35rem 0.7rem', fontSize: '0.9rem' }}>School identity</span>
        <span style={{ background: '#eff6ff', color: '#1d4ed8', borderRadius: 999, padding: '0.35rem 0.7rem', fontSize: '0.9rem' }}>Visual theme</span>
        <span style={{ background: '#eff6ff', color: '#1d4ed8', borderRadius: 999, padding: '0.35rem 0.7rem', fontSize: '0.9rem' }}>Contact details</span>
      </div>
    </section>
  );
}
