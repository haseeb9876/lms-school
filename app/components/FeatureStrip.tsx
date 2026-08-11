'use client';

type FeatureStripProps = {
  title: string;
  items: Array<{ heading: string; detail: string }>;
};

export default function FeatureStrip({ title, items }: FeatureStripProps) {
  return (
    <section style={{ border: '1px solid #e2e8f0', borderRadius: 20, padding: '1rem', background: '#ffffff', boxShadow: '0 10px 24px rgba(15, 23, 42, 0.04)' }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {items.map((item) => (
          <div key={item.heading} style={{ border: '1px solid #e2e8f0', borderRadius: 14, padding: '0.85rem 0.95rem', background: '#f8fafc' }}>
            <strong>{item.heading}</strong>
            <div style={{ color: '#64748b', marginTop: '0.2rem' }}>{item.detail}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
