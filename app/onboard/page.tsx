"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SetupChecklist from '@/app/components/SetupChecklist';
import GuidedCard from '@/app/components/GuidedCard';

export default function OnboardPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    const response = await fetch('/api/onboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug })
    });

    const result = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(result.message || 'Onboarding failed');
      return;
    }

    setMessage(`School created: ${result.school.name}`);
    router.push('/dashboard');
  }

  return (
    <main className="page-shell">
      <GuidedCard
        eyebrow="School onboarding"
        title="Create a new school profile"
        description="This guided setup helps you create a school identity, prepare branding, and get ready for secure school operations."
      >
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.9rem' }}>
          <label>
            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>School name</div>
            <input value={name} onChange={(event) => setName(event.target.value)} required style={{ width: '100%', padding: '0.8rem', borderRadius: 8, border: '1px solid #dbeafe', background: '#fff' }} placeholder="Greenhill School" />
          </label>
          <label>
            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>School slug</div>
            <input value={slug} onChange={(event) => setSlug(event.target.value)} required style={{ width: '100%', padding: '0.8rem', borderRadius: 8, border: '1px solid #dbeafe', background: '#fff' }} placeholder="greenhill" />
          </label>
          {message ? <p style={{ color: '#0f766e', margin: 0 }}>{message}</p> : null}
          <button className="primary-btn" type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create school'}
          </button>
        </form>

        <div style={{ marginTop: '1rem' }}>
          <SetupChecklist
            items={[
              { title: 'Secure school profile', description: 'Create a protected school identity with a unique slug.', done: Boolean(name && slug) },
              { title: 'Branding setup', description: 'Customize the portal with school colors, story, and identity.', done: false },
              { title: 'Role-based workflows', description: 'Enable principal, teacher, student, and parent modules.', done: true }
            ]}
          />
        </div>
      </GuidedCard>
    </main>
  );
}
