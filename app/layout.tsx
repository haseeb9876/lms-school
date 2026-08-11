import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'School LMS | Secure School Management Platform',
  description: 'Professional school management and learning platform for Pakistan schools with secure branding, role-based access, and modern school workflows.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ minHeight: '100vh', background: '#f4f7fb' }}>{children}</body>
    </html>
  );
}
