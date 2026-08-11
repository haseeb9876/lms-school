'use client';

type BrandingChecklistProps = {
  items: Array<{ label: string; done: boolean }>;
};

export default function BrandingChecklist({ items }: BrandingChecklistProps) {
  return (
    <section style={{ border: '1px solid #e2e8f0', borderRadius: 18, padding: '1rem', background: '#ffffff', boxShadow: '0 10px 24px rgba(15, 23, 42, 0.04)' }}>
      <h3 style={{ marginTop: 0 }}>Branding checklist</h3>
      <div style={{ display: 'grid', gap: '0.65rem' }}>
        {items.map((item) => (
          <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: 12, padding: '0.75rem 0.9rem', background: item.done ? '#f0fdf4' : '#f8fafc', border: '1px solid #e2e8f0' }}>
            <span>{item.label}</span>
            <span style={{ color: item.done ? '#15803d' : '#64748b', fontWeight: 700 }}>{item.done ? 'Ready' : 'Pending'}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
