"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import type { SchoolSettings } from "@prisma/client";
import { brandingUpdateSchema } from "@/lib/schemas/branding";
import { InputField } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Card, CardContent } from "@/components/ui/Card";

type BrandingValues = z.infer<typeof brandingUpdateSchema>;

const HEX_PATTERN = /^#([0-9A-Fa-f]{6})$/;

export function BrandingSettingsForm({ initialSettings }: { initialSettings: SchoolSettings | null }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState(initialSettings?.logoUrl ?? null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BrandingValues>({
    resolver: zodResolver(brandingUpdateSchema),
    defaultValues: {
      schoolName: initialSettings?.schoolName ?? "",
      primaryColor: initialSettings?.primaryColor ?? "#0e6e68",
      address: initialSettings?.address ?? "",
      phone: initialSettings?.phone ?? "",
      email: initialSettings?.email ?? "",
      website: initialSettings?.website ?? "",
    },
  });

  const primaryColor = watch("primaryColor");

  async function onSubmit(values: BrandingValues) {
    setServerError(null);
    setSuccessMessage(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/principal/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error ?? "Something went wrong.");
        return;
      }
      setSuccessMessage("Saved. Your changes are live across the app.");
      router.refresh();
    } catch {
      setServerError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setLogoError(null);
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const res = await fetch("/api/principal/branding/logo", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setLogoError(data.error ?? "Could not upload the logo.");
        return;
      }
      setLogoUrl(data.logoUrl);
      router.refresh();
    } catch {
      setLogoError("Could not reach the server. Check your connection and try again.");
    } finally {
      setLogoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-neutral-900">School logo</h2>
          {logoError && <Alert variant="danger">{logoError}</Alert>}
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="School logo" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs text-neutral-400">No logo</span>
              )}
            </div>
            <div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={logoUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                Upload new logo
              </Button>
              <p className="mt-1 text-xs text-neutral-500">PNG, JPEG, WebP, or SVG. Max 2MB.</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={handleLogoChange}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            {serverError && <Alert variant="danger">{serverError}</Alert>}
            {successMessage && <Alert variant="success">{successMessage}</Alert>}

            <InputField label="School name" error={errors.schoolName?.message} {...register("schoolName")} />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-neutral-800">Brand color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  aria-label="Pick brand color"
                  value={HEX_PATTERN.test(primaryColor ?? "") ? primaryColor : "#0e6e68"}
                  onChange={(e) => setValue("primaryColor", e.target.value, { shouldValidate: true })}
                  className="h-10 w-14 flex-none cursor-pointer rounded-md border border-neutral-200"
                />
                <input
                  className="h-10 flex-1 rounded-md border border-neutral-200 px-3 text-sm text-neutral-900"
                  {...register("primaryColor")}
                />
              </div>
              {errors.primaryColor && <p className="text-xs text-danger">{errors.primaryColor.message}</p>}
              <p className="text-xs text-neutral-500">Used for buttons, links, and highlights throughout the app.</p>
            </div>

            <InputField label="Address" error={errors.address?.message} {...register("address")} />
            <InputField label="Phone" error={errors.phone?.message} {...register("phone")} />
            <InputField label="Email" type="email" error={errors.email?.message} {...register("email")} />
            <InputField
              label="Website"
              placeholder="https://"
              error={errors.website?.message}
              {...register("website")}
            />

            <Button type="submit" loading={submitting} className="self-start">
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
