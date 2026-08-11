'use client';

type QuickAction = {
  label: string;
  href: string;
};

type QuickActionsProps = {
  actions: QuickAction[];
};

export default function QuickActions({ actions }: QuickActionsProps) {
  return (
    <section style={{ border: '1px solid #e2e8f0', borderRadius: 18, padding: '1rem', background: '#ffffff', boxShadow: '0 10px 24px rgba(15, 23, 42, 0.04)' }}>
      <h3 style={{ marginTop: 0 }}>Quick actions</h3>
      <div style={{ display: 'flex', gap: '0.7rem', flexWrap: 'wrap' }}>
        {actions.map((action) => (
          <a key={action.label} href={action.href} style={{ borderRadius: 999, padding: '0.6rem 0.9rem', background: '#eff6ff', color: '#1d4ed8', fontWeight: 700 }}>
            {action.label}
          </a>
        ))}
      </div>
    </section>
  );
}
