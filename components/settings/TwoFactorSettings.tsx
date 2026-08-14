"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { InputField } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

type Stage = "idle" | "enrolling" | "recoveryCodes" | "disabling";

export function TwoFactorSettings({ initiallyEnabled }: { initiallyEnabled: boolean }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initiallyEnabled);
  const [stage, setStage] = useState<Stage>("idle");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [disablePassword, setDisablePassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function startEnrollment() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/2fa/totp/enroll", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not start setup.");
        return;
      }
      setQrDataUrl(data.qrDataUrl);
      setSecret(data.secret);
      setStage("enrolling");
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmEnrollment() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/2fa/totp/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "That code isn't valid.");
        return;
      }
      setRecoveryCodes(data.recoveryCodes);
      setEnabled(true);
      setStage("recoveryCodes");
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function disable() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: disablePassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not disable two-factor authentication.");
        return;
      }
      setEnabled(false);
      setStage("idle");
      setDisablePassword("");
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function finishRecoveryCodes() {
    setStage("idle");
    setCode("");
    setQrDataUrl(null);
    setSecret(null);
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">Two-factor authentication</h2>
          <Badge variant={enabled ? "success" : "neutral"}>{enabled ? "Enabled" : "Disabled"}</Badge>
        </div>
        <p className="text-sm text-neutral-500">
          Adds a second step at sign-in using an authenticator app, on top of your password.
        </p>

        {error && <Alert variant="danger">{error}</Alert>}

        {stage === "idle" && !enabled && (
          <Button onClick={startEnrollment} loading={submitting} className="self-start">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Enable two-factor authentication
          </Button>
        )}

        {stage === "idle" && enabled && (
          <Button variant="danger" onClick={() => setStage("disabling")} className="self-start">
            <ShieldOff className="h-4 w-4" aria-hidden="true" />
            Disable two-factor authentication
          </Button>
        )}

        {stage === "disabling" && (
          <div className="flex flex-col gap-3 rounded-md border border-neutral-200 p-4">
            <InputField
              label="Confirm your password to disable"
              type="password"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
            />
            <div className="flex gap-2">
              <Button variant="danger" onClick={disable} loading={submitting}>
                Disable
              </Button>
              <Button variant="secondary" onClick={() => setStage("idle")}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {stage === "enrolling" && (
          <div className="flex flex-col gap-3 rounded-md border border-neutral-200 p-4">
            <p className="text-sm text-neutral-700">
              Scan this QR code with an authenticator app (Google Authenticator, Authy, etc.), then enter the 6-digit
              code it shows.
            </p>
            {qrDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="Scan with your authenticator app" className="h-40 w-40 self-center" />
            )}
            {secret && (
              <p className="break-all rounded-md bg-neutral-100 px-3 py-2 text-center font-mono text-xs text-neutral-600">
                {secret}
              </p>
            )}
            <InputField
              label="6-digit code"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <div className="flex gap-2">
              <Button onClick={confirmEnrollment} loading={submitting}>
                Confirm
              </Button>
              <Button variant="secondary" onClick={() => setStage("idle")}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {stage === "recoveryCodes" && (
          <div className="flex flex-col gap-3 rounded-md border border-warning/30 bg-warning-soft p-4">
            <p className="text-sm font-medium text-warning">
              Save these recovery codes somewhere safe. Each one can be used once if you lose access to your
              authenticator app. They won&apos;t be shown again.
            </p>
            <div className="grid grid-cols-2 gap-2 font-mono text-sm text-neutral-900">
              {recoveryCodes.map((rc) => (
                <span key={rc} className="rounded-md bg-white px-2 py-1 text-center">
                  {rc}
                </span>
              ))}
            </div>
            <Button onClick={finishRecoveryCodes} className="self-start">
              I&apos;ve saved these
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
