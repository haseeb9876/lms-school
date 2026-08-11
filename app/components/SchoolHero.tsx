'use client';

import Link from 'next/link';
import Image from 'next/image';

type SchoolHeroProps = {
  name: string;
  heroTitle: string;
  heroSubtitle: string;
  primaryColor: string;
  secondaryColor: string;
};

export default function SchoolHero({ name, heroTitle, heroSubtitle, primaryColor, secondaryColor }: SchoolHeroProps) {
  return (
    <section style={{ borderRadius: 28, overflow: 'hidden', border: '1px solid #dbeafe', boxShadow: '0 18px 40px rgba(15, 23, 42, 0.08)', background: '#ffffff' }}>
      <div style={{ padding: '2rem', background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`, color: 'white' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1.2rem', alignItems: 'center' }}>
          <div>
            <p style={{ margin: 0, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '0.8rem' }}>Secure school portal</p>
            <h1 style={{ fontSize: '2.2rem', margin: '0.3rem 0 0.6rem' }}>{heroTitle}</h1>
            <p style={{ margin: 0, maxWidth: 620, lineHeight: 1.6 }}>{heroSubtitle}</p>
            <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', marginTop: '1rem' }}>
              <Link href="/login" className="primary-btn" style={{ background: '#ffffff', color: primaryColor }}>Access portal</Link>
              <Link href="/settings" className="secondary-btn" style={{ background: 'rgba(255,255,255,0.16)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.3)' }}>Customize branding</Link>
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.16)', borderRadius: 20, padding: '0.8rem', backdropFilter: 'blur(6px)' }}>
            <Image src="/school-building.svg" alt="Educational institution building illustration" width={420} height={280} style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 16 }} />
          </div>
        </div>
      </div>
      <div style={{ padding: '1.2rem 1.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <strong>{name}</strong>
          <div style={{ color: '#64748b' }}>Professional LMS • Secure learning environment</div>
        </div>
        <div style={{ color: '#0f766e', fontWeight: 700 }}>Confidential • Trusted • Modern</div>
      </div>
    </section>
  );
}
