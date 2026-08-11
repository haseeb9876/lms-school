"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type ProtectedRouteProps = {
  allowedRoles?: Array<'PRINCIPAL' | 'TEACHER' | 'STUDENT' | 'PARENT'>;
  children: React.ReactNode;
};

export default function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    async function checkAccess() {
      const response = await fetch('/api/health', { cache: 'no-store' });
      if (!response.ok) {
        router.replace('/login');
        return;
      }

      const data = await response.json();
      if (data.user && allowedRoles && !allowedRoles.includes(data.user.role)) {
        router.replace('/dashboard');
        return;
      }

      setAuthorized(true);
    }

    checkAccess();
  }, [allowedRoles, router]);

  if (!authorized) return null;
  return <>{children}</>;
}
