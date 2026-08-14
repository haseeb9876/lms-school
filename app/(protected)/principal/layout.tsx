import type { ReactNode } from "react";
import { requireAuth } from "@/lib/auth/current-user";

/**
 * Nested, role-specific guard — even if a page under /principal forgets its
 * own check, Next.js always runs this layout first, so the check still
 * fires (see lib/auth/with-auth.ts for the equivalent on API routes).
 */
export default async function PrincipalLayout({ children }: { children: ReactNode }) {
  await requireAuth(["PRINCIPAL"]);
  return <>{children}</>;
}
