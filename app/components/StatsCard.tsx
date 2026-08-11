'use client';

type StatsCardProps = {
  title: string;
  value: string;
  description: string;
};

export default function StatsCard({ title, value, description }: StatsCardProps) {
  return (
    <article style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: '1rem', background: '#ffffff', boxShadow: '0 10px 24px rgba(15, 23, 42, 0.04)' }}>
      <div style={{ color: '#64748b', fontSize: '0.9rem' }}>{title}</div>
      <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.25rem' }}>{value}</div>
      <div style={{ color: '#64748b', marginTop: '0.35rem' }}>{description}</div>
    </article>
  );
}
