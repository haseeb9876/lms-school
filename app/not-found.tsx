import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="page-shell">
      <section className="hero-card" style={{ maxWidth: 640, margin: '2rem auto' }}>
        <p className="eyebrow">Page unavailable</p>
        <h1>That page could not be found</h1>
        <p className="lead">The link may be incomplete or the route may not be available yet. Please return to the dashboard or home page.</p>
        <div className="actions">
          <Link href="/" className="primary-btn">Go home</Link>
          <Link href="/dashboard" className="secondary-btn">Open dashboard</Link>
        </div>
      </section>
    </main>
  );
}
