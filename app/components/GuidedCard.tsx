'use client';

import Image from 'next/image';

type GuidedCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  imageSrc?: string;
  imageAlt?: string;
};

export default function GuidedCard({ eyebrow, title, description, children, imageSrc = '/school-building.svg', imageAlt = 'Educational illustration' }: GuidedCardProps) {
  return (
    <section className="hero-card" style={{ maxWidth: 620, margin: '2rem auto', overflow: 'hidden' }}>
      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1.2fr 0.8fr', alignItems: 'center' }}>
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1 style={{ fontSize: '1.8rem' }}>{title}</h1>
          <p className="lead">{description}</p>
          <div style={{ marginTop: '1rem' }}>{children}</div>
        </div>
        <div style={{ background: '#f8fbff', borderRadius: 18, padding: '0.7rem', border: '1px solid #dbeafe' }}>
          <Image src={imageSrc} alt={imageAlt} width={320} height={240} style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 12 }} />
        </div>
      </div>
    </section>
  );
}
