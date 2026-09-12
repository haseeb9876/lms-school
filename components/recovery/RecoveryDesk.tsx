"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import {
  BadgeCheck,
  Copy,
  KeyRound,
  Printer,
  RotateCcw,
  Search,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import {
  issueTemporaryPassword,
  lookupAccountForRecovery,
  setPasswordAtCounter,
} from "@/lib/actions/account-recovery";
import type { RecoveryMatch } from "@/lib/queries/account-recovery";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { InputField } from "@/components/ui/Input";
import { PasswordField } from "@/components/ui/PasswordField";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime, humanizeEnum } from "@/lib/format";

type Mode = "counter" | "temporary";

interface Issued {
  name: string;
  cnic: string;
  password?: string;
}

const ROLE_LABEL: Record<string, string> = {
  PRINCIPAL: "Principal",
  TEACHER: "Teacher",
  STUDENT: "Student",
  PARENT: "Guardian",
};

/**
 * The three steps of a counter password reset, one screen.
 *
 * Find → verify → hand over. They are laid out in that order and the later
 * steps do not appear until the earlier ones are done, because the failure
 * this design is guarding against is a principal with a queue at the desk
 * clicking straight to "reset" without looking at who they matched.
 */
export function RecoveryDesk() {
  const [identifier, setIdentifier] = useState("");
  const [match, setMatch] = useState<RecoveryMatch | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [searching, startSearch] = useTransition();

  const [mode, setMode] = useState<Mode>("counter");
  const [verified, setVerified] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [resetting, startReset] = useTransition();
  const [issued, setIssued] = useState<Issued | null>(null);

  const toast = useToast();
  const passwordRef = useRef<HTMLDivElement>(null);

  function reset() {
    setIdentifier("");
    setMatch(null);
    setLookupError(null);
    setVerified(false);
    setPassword("");
    setConfirm("");
    setFieldErrors({});
    setIssued(null);
    setMode("counter");
  }

  function onSearch(event: FormEvent) {
    event.preventDefault();
    setLookupError(null);
    setMatch(null);
    setIssued(null);
    setVerified(false);

    startSearch(async () => {
      const result = await lookupAccountForRecovery({ identifier });
      if (result.ok) setMatch(result.data);
      else setLookupError(result.error);
    });
  }

  function onReset(event: FormEvent) {
    event.preventDefault();
    if (!match) return;
    setFieldErrors({});

    startReset(async () => {
      const result =
        mode === "counter"
          ? await setPasswordAtCounter({
              userId: match.id,
              identityVerified: verified as true,
              password,
              confirmPassword: confirm,
            })
          : await issueTemporaryPassword({ userId: match.id, identityVerified: verified as true });

      if (result.ok) {
        toast.success(result.message ?? "Password updated.");
        setIssued(result.data as Issued);
        setPassword("");
        setConfirm("");
      } else {
        setFieldErrors(result.fieldErrors ?? {});
        if (!result.fieldErrors) toast.error(result.error);
      }
    });
  }

  async function copyDetails() {
    if (!issued) return;
    const lines = [
      issued.name,
      `Sign in with: ${issued.cnic}`,
      issued.password ? `Temporary password: ${issued.password}` : "Password: chosen at the counter",
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success("Copied.");
    } catch {
      // Clipboard access can be blocked; the details are on screen anyway.
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ---------------------------------------------------------------- */}
      {/* Step 1 — find the account                                        */}
      {/* ---------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand">
              1
            </span>
            Ask for their CNIC
          </CardTitle>
          <p className="mt-1 text-sm text-fg-subtle">
            Exact number only — this doesn&apos;t search by name, so the wrong person&apos;s account
            can&apos;t be opened by mistake. A guardian&apos;s registered phone number also works.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSearch} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <InputField
              label="CNIC number"
              className="flex-1"
              inputMode="numeric"
              autoComplete="off"
              placeholder="42101-1234567-1"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              error={lookupError ?? undefined}
              autoFocus
            />
            <Button type="submit" loading={searching} className="sm:mb-0.5">
              <Search className="h-4 w-4" aria-hidden="true" />
              Find account
            </Button>
            {(match || lookupError) && (
              <Button type="button" variant="ghost" onClick={reset} className="sm:mb-0.5">
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Start over
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* ---------------------------------------------------------------- */}
      {/* Step 2 — check it is really them                                 */}
      {/* ---------------------------------------------------------------- */}
      {match && !issued && (
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand">
                2
              </span>
              Check this is the right person
            </CardTitle>
            <p className="mt-1 text-sm text-fg-subtle">
              A CNIC is printed on a card and known to family — it proves the number, not the
              person. Ask about something below before going on.
            </p>
          </CardHeader>

          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface-sunken p-4">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-brand-soft text-brand">
                <UserRound className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-semibold text-fg">
                  {match.name}
                  <Badge variant="neutral">{ROLE_LABEL[match.role] ?? humanizeEnum(match.role)}</Badge>
                  {match.status === "SUSPENDED" && <Badge variant="danger">Suspended</Badge>}
                </p>
                <p className="font-mono text-xs tabular-nums text-fg-subtle">{match.cnic}</p>
              </div>
            </div>

            {match.identifiers.length > 0 && (
              <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                {match.identifiers.map((item) => (
                  <div key={`${item.label}-${item.value}`} className="flex gap-2 text-sm">
                    <dt className="w-32 flex-none text-fg-subtle">{item.label}</dt>
                    <dd className="min-w-0 break-words font-medium text-fg">{item.value}</dd>
                  </div>
                ))}
                <div className="flex gap-2 text-sm">
                  <dt className="w-32 flex-none text-fg-subtle">Last signed in</dt>
                  <dd className="font-medium text-fg">
                    {match.lastLoginAt ? formatDateTime(match.lastLoginAt) : "Never"}
                  </dd>
                </div>
              </dl>
            )}

            {match.status === "SUSPENDED" && (
              <Alert variant="danger" title="This account is suspended">
                A new password won&apos;t let them in while it is. Restore the account first.
              </Alert>
            )}

            {match.activeSessions > 0 && (
              <Alert variant="info">
                {match.activeSessions === 1
                  ? "This account is signed in on 1 device, which will be signed out."
                  : `This account is signed in on ${match.activeSessions} devices, all of which will be signed out.`}
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Step 3 — hand the account back                                   */}
      {/* ---------------------------------------------------------------- */}
      {match && !issued && match.status === "ACTIVE" && (
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand">
                3
              </span>
              Set the new password
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={onReset} className="flex flex-col gap-5">
              <fieldset className="flex flex-col gap-2">
                <legend className="sr-only">How the password is being set</legend>

                <ModeOption
                  checked={mode === "counter"}
                  onSelect={() => setMode("counter")}
                  title="They're here — let them type it"
                  description="Turn the screen towards them. Nobody else sees it, there's nothing to write down, and they can sign in straight away."
                  recommended
                />
                <ModeOption
                  checked={mode === "temporary"}
                  onSelect={() => setMode("temporary")}
                  title="Issue a temporary password"
                  description="For a phone call, or when someone collects on their behalf. Shown once, and they'll be asked to change it when they sign in."
                />
              </fieldset>

              {mode === "counter" && (
                <div ref={passwordRef} className="flex flex-col gap-4 rounded-lg border border-line bg-surface-sunken p-4">
                  <p className="text-sm text-fg-muted">
                    Hand over the keyboard. The password is hidden as it&apos;s typed and is never
                    shown back to you.
                  </p>
                  <PasswordField
                    label="New password"
                    autoComplete="new-password"
                    showRequirements
                    value={password}
                    onValueChange={setPassword}
                    error={fieldErrors.password}
                  />
                  <PasswordField
                    label="Type it again"
                    autoComplete="new-password"
                    value={confirm}
                    onValueChange={setConfirm}
                    error={fieldErrors.confirmPassword}
                  />
                </div>
              )}

              <Checkbox
                label="I have checked who this person is."
                hint="Recorded in the audit log against your name."
                checked={verified}
                onChange={(event) => setVerified(event.target.checked)}
              />
              {fieldErrors.identityVerified && (
                <p className="-mt-3 text-sm text-danger">{fieldErrors.identityVerified}</p>
              )}

              <div>
                <Button type="submit" loading={resetting} disabled={!verified}>
                  <KeyRound className="h-4 w-4" aria-hidden="true" />
                  {mode === "counter" ? "Save their password" : "Issue temporary password"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Done                                                             */}
      {/* ---------------------------------------------------------------- */}
      {issued && (
        <Card data-print-area>
          <CardHeader className="flex flex-wrap items-start justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-success" aria-hidden="true" />
              {issued.password ? "Temporary password issued" : "Password set"}
            </CardTitle>
            <div className="flex flex-wrap gap-2" data-print-hide>
              <Button variant="secondary" size="sm" onClick={copyDetails}>
                <Copy className="h-4 w-4" aria-hidden="true" />
                Copy
              </Button>
              {issued.password && (
                <Button variant="secondary" size="sm" onClick={() => window.print()}>
                  <Printer className="h-4 w-4" aria-hidden="true" />
                  Print slip
                </Button>
              )}
              <Button size="sm" onClick={reset}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Next person
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex flex-col gap-4">
            <dl className="flex flex-col gap-2 rounded-lg border border-line bg-surface-sunken p-4 text-sm">
              <div className="flex gap-2">
                <dt className="w-40 flex-none text-fg-subtle">Name</dt>
                <dd className="font-medium text-fg">{issued.name}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-40 flex-none text-fg-subtle">Sign in with</dt>
                <dd className="font-mono tabular-nums text-fg">{issued.cnic}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-40 flex-none text-fg-subtle">Password</dt>
                <dd className="font-mono font-semibold text-fg">
                  {issued.password ?? "The one they just chose"}
                </dd>
              </div>
            </dl>

            {issued.password ? (
              <Alert variant="warning" title="Shown once">
                This password is stored only as a hash and can&apos;t be looked up again. If it&apos;s
                lost, come back to this page and issue another. They&apos;ll be asked to choose their
                own when they sign in.
              </Alert>
            ) : (
              <Alert variant="success">
                Ask them to sign in on their own phone before they leave the office — that way a
                mistyped password is found now rather than tonight.
              </Alert>
            )}

            <p className="flex items-start gap-2 text-xs text-fg-subtle">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 flex-none" aria-hidden="true" />
              Every device signed in to this account has been signed out, and any outstanding reset
              link has been cancelled.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ModeOption({
  checked,
  onSelect,
  title,
  description,
  recommended = false,
}: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  description: string;
  recommended?: boolean;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-colors ${
        checked ? "border-brand bg-brand-soft/40" : "border-line hover:bg-surface-hover"
      }`}
    >
      <input
        type="radio"
        name="handover-mode"
        checked={checked}
        onChange={onSelect}
        className="mt-0.5 h-4 w-4 flex-none accent-brand"
      />
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-fg">
          {title}
          {recommended && <Badge variant="success">Recommended</Badge>}
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-fg-subtle">{description}</span>
      </span>
    </label>
  );
}
