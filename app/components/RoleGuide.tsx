'use client';

type RoleGuideProps = {
  title: string;
  description: string;
  bullets: string[];
};

export default function RoleGuide({ title, description, bullets }: RoleGuideProps) {
  return (
    <section style={{ borderRadius: 18, padding: '1rem', background: '#f8fbff', border: '1px solid #dbeafe', marginTop: '1rem' }}>
      <h3 style={{ marginTop: 0, marginBottom: '0.35rem' }}>{title}</h3>
      <p style={{ margin: 0, color: '#475569', lineHeight: 1.6 }}>{description}</p>
      <ul style={{ margin: '0.75rem 0 0', paddingLeft: '1.1rem', color: '#1d4ed8' }}>
        {bullets.map((item) => (
          <li key={item} style={{ marginBottom: '0.3rem' }}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
