'use client';

import { useState } from 'react';

type SchoolSettings = {
  name: string;
  heroTitle: string;
  heroSubtitle: string;
  successStories: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  websiteUrl: string;
};

type SchoolSettingsFormProps = {
  initialData: SchoolSettings;
};

export default function SchoolSettingsForm({ initialData }: SchoolSettingsFormProps) {
  const [form, setForm] = useState(initialData);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    const response = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });

    const result = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(result.message || 'Unable to save settings');
      return;
    }

    setMessage(result.message || 'School branding updated successfully');
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
      <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.6rem' }}>
        <h3 style={{ margin: 0 }}>School details</h3>
        <p style={{ margin: '0.2rem 0 0', color: '#64748b' }}>Start with the basics so the portal clearly represents your school.</p>
      </div>
      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        <label>
          <div>School name</div>
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required style={{ width: '100%', padding: '0.8rem', borderRadius: 10, border: '1px solid #dbeafe' }} />
        </label>
        <label>
          <div>Logo URL</div>
          <input value={form.logoUrl} onChange={(event) => setForm({ ...form, logoUrl: event.target.value })} placeholder="https://example.com/logo.png" style={{ width: '100%', padding: '0.8rem', borderRadius: 10, border: '1px solid #dbeafe' }} />
        </label>
        <label>
          <div>Contact email</div>
          <input value={form.contactEmail} onChange={(event) => setForm({ ...form, contactEmail: event.target.value })} placeholder="info@school.edu.pk" style={{ width: '100%', padding: '0.8rem', borderRadius: 10, border: '1px solid #dbeafe' }} />
        </label>
        <label>
          <div>Contact phone</div>
          <input value={form.contactPhone} onChange={(event) => setForm({ ...form, contactPhone: event.target.value })} placeholder="+92 300 1234567" style={{ width: '100%', padding: '0.8rem', borderRadius: 10, border: '1px solid #dbeafe' }} />
        </label>
      </div>

      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.6rem' }}>
        <h3 style={{ margin: 0 }}>Welcome message</h3>
        <p style={{ margin: '0.2rem 0 0.6rem', color: '#64748b' }}>Write a welcoming message that helps visitors understand the school values.</p>
      </div>
      <label>
        <div>Hero title</div>
        <input value={form.heroTitle} onChange={(event) => setForm({ ...form, heroTitle: event.target.value })} required style={{ width: '100%', padding: '0.8rem', borderRadius: 10, border: '1px solid #dbeafe' }} />
      </label>
      <label>
        <div>Hero subtitle</div>
        <textarea value={form.heroSubtitle} onChange={(event) => setForm({ ...form, heroSubtitle: event.target.value })} rows={3} style={{ width: '100%', padding: '0.8rem', borderRadius: 10, border: '1px solid #dbeafe' }} />
      </label>
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.6rem' }}>
        <h3 style={{ margin: 0 }}>Identity and contact</h3>
        <p style={{ margin: '0.2rem 0 0.6rem', color: '#64748b' }}>Choose colors and add contact details so the portal feels complete.</p>
      </div>
      <label>
        <div>Success stories</div>
        <textarea value={form.successStories} onChange={(event) => setForm({ ...form, successStories: event.target.value })} rows={4} style={{ width: '100%', padding: '0.8rem', borderRadius: 10, border: '1px solid #dbeafe' }} />
      </label>
      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <label>
          <div>Primary color</div>
          <input type="color" value={form.primaryColor} onChange={(event) => setForm({ ...form, primaryColor: event.target.value })} />
        </label>
        <label>
          <div>Secondary color</div>
          <input type="color" value={form.secondaryColor} onChange={(event) => setForm({ ...form, secondaryColor: event.target.value })} />
        </label>
        <label>
          <div>Website URL</div>
          <input value={form.websiteUrl} onChange={(event) => setForm({ ...form, websiteUrl: event.target.value })} placeholder="https://school.edu.pk" style={{ width: '100%', padding: '0.8rem', borderRadius: 10, border: '1px solid #dbeafe' }} />
        </label>
      </div>
      <label>
        <div>Address</div>
        <textarea value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} rows={2} style={{ width: '100%', padding: '0.8rem', borderRadius: 10, border: '1px solid #dbeafe' }} />
      </label>
      {message ? <p style={{ color: '#0f766e', fontWeight: 600 }}>{message}</p> : null}
      <button className="primary-btn" type="submit" disabled={loading}>
        {loading ? 'Saving...' : 'Save school branding'}
      </button>
    </form>
  );
}
