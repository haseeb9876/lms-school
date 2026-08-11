'use client';

type SetupChecklistProps = {
  items: Array<{ title: string; description: string; done: boolean }>;
};

export default function SetupChecklist({ items }: SetupChecklistProps) {
  return (
    <section style={{ border: '1px solid #e2e8f0', borderRadius: 18, padding: '1rem', background: '#ffffff', boxShadow: '0 10px 24px rgba(15, 23, 42, 0.04)' }}>
      <h3 style={{ marginTop: 0 }}>Implementation checklist</h3>
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {items.map((item) => (
          <div key={item.title} style={{ border: '1px solid #e2e8f0', borderRadius: 14, padding: '0.85rem 0.95rem', background: item.done ? '#f0fdf4' : '#f8fafc' }}>
            <div style={{ fontWeight: 700 }}>{item.title}</div>
            <div style={{ color: '#64748b', marginTop: '0.2rem' }}>{item.description}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
