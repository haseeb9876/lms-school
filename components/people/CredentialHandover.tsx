"use client";

import { useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { Alert } from "@/components/ui/Alert";

export interface Credential {
  label: string;
  cnic: string;
  password: string;
}

/**
 * Shows a newly created account's sign-in details exactly once.
 *
 * The temporary password is never stored in readable form — only its bcrypt
 * hash is — so this panel is the only moment it can be handed over. If the
 * principal closes the dialog without copying it, the account needs a
 * password reset rather than a lookup. That's the intended trade: a
 * password an administrator can look up later is a password the account
 * holder doesn't really own.
 */
export function CredentialHandover({ credentials }: { credentials: Credential[] }) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(credential: Credential) {
    const text = `${credential.label}\nCNIC: ${credential.cnic}\nTemporary password: ${credential.password}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(credential.label);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard access can be blocked; the values are on screen to be
      // written down either way, so this needs no error state.
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Alert variant="warning" title="Write these down now">
        These passwords are shown only once and can&apos;t be looked up later. Each person will be
        asked to choose their own password when they first sign in.
      </Alert>

      {credentials.map((credential) => (
        <div key={credential.label} className="rounded-lg border border-line bg-surface-sunken p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-fg">
                <KeyRound className="h-3.5 w-3.5 text-fg-subtle" aria-hidden="true" />
                {credential.label}
              </p>
              <dl className="mt-2 flex flex-col gap-1 text-sm">
                <div className="flex gap-2">
                  <dt className="w-36 flex-none text-fg-subtle">Sign in with</dt>
                  <dd className="font-mono tabular-nums text-fg">{credential.cnic}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-36 flex-none text-fg-subtle">Temporary password</dt>
                  <dd className="font-mono font-semibold text-fg">{credential.password}</dd>
                </div>
              </dl>
            </div>

            <button
              type="button"
              onClick={() => copy(credential)}
              className="inline-flex h-8 flex-none items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg"
            >
              {copied === credential.label ? (
                <>
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
