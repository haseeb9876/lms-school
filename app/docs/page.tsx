import FeatureStrip from '@/app/components/FeatureStrip';

export default function DocsPage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">Architecture</p>
        <h1>Professional LMS architecture for school systems</h1>
        <p className="lead">
          This foundation is designed around multi-tenant schools, secure role-based access, multilingual support, and modular expansion.
        </p>
      </section>

      <section className="module-grid">
        <article className="module-card">
          <h2>Security</h2>
          <p>Authentication, role-based authorization, signed sessions, and secure school isolation.</p>
        </article>
        <article className="module-card">
          <h2>Performance</h2>
          <p>Fast server rendering, clean component architecture, and scalable API design for modern school systems.</p>
        </article>
        <article className="module-card">
          <h2>Customization</h2>
          <p>Each school can define its own branding, users, workflows, and modules without affecting others.</p>
        </article>
      </section>

      <section style={{ marginTop: '1rem' }}>
        <FeatureStrip
          title="Core platform capabilities"
          items={[
            { heading: 'Secure portal access', detail: 'Role-based entry for principals, teachers, students, and parents.' },
            { heading: 'School-specific branding', detail: 'Each institution can personalize the platform experience and visual identity.' },
            { heading: 'Academic workflow support', detail: 'Structured modules for classes, students, attendance, assignments, and announcements.' }
          ]}
        />
      </section>
    </main>
  );
}
