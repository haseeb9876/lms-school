"use client";

import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { ImageUp, Trash2 } from "lucide-react";
import type { SchoolSettings } from "@prisma/client";
import { removeBrandingImage, updateBranding, uploadBrandingImage } from "@/lib/actions/branding";
import { InputField } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { isValidHexColor } from "@/lib/color";
import { cn } from "@/lib/cn";

type ImageKind = "logo" | "buildingImage";

export function BrandingSettingsForm({ initialSettings }: { initialSettings: SchoolSettings | null }) {
  const router = useRouter();
  const toast = useToast();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const [primaryColor, setPrimaryColor] = useState(initialSettings?.primaryColor ?? "#0e6e68");

  function handleSubmit(formData: FormData) {
    setFieldErrors({});
    const value = (key: string) => String(formData.get(key) ?? "");

    startTransition(async () => {
      const result = await updateBranding({
        schoolName: value("schoolName"),
        tagline: value("tagline"),
        primaryColor: value("primaryColor"),
        address: value("address"),
        phone: value("phone"),
        email: value("email"),
        website: value("website"),
      });

      if (result.ok) {
        toast.success(result.message ?? "Saved.");
        router.refresh();
      } else {
        setFieldErrors(result.fieldErrors ?? {});
        if (!result.fieldErrors) toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <ImageUploader
        kind="logo"
        title="School logo"
        description="Shown in the sidebar, on the welcome screen and on printed documents."
        hint="PNG, JPEG, WebP or SVG. Up to 2MB."
        currentUrl={initialSettings?.logoUrl ?? null}
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        preview="square"
      />

      <ImageUploader
        kind="buildingImage"
        title="School photograph"
        description="Used as the backdrop on the welcome screen visitors see before signing in."
        hint="A wide photo of the school works best. PNG, JPEG, WebP or AVIF, up to 8MB."
        currentUrl={initialSettings?.buildingImageUrl ?? null}
        accept="image/png,image/jpeg,image/webp,image/avif"
        preview="wide"
      />

      <Card>
        <CardContent>
          <h2 className="mb-4 text-sm font-semibold text-fg">School details</h2>

          <form action={handleSubmit} className="flex flex-col gap-4">
            <InputField
              name="schoolName"
              label="School name"
              required
              defaultValue={initialSettings?.schoolName ?? ""}
              error={fieldErrors.schoolName}
            />

            <InputField
              name="tagline"
              label="Tagline"
              placeholder="Educating with knowledge and character since 1998"
              hint="One line, shown under the school name on the welcome screen."
              defaultValue={initialSettings?.tagline ?? ""}
              error={fieldErrors.tagline}
            />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="primaryColor" className="text-sm font-medium text-fg">
                Brand color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  aria-label="Pick brand color"
                  value={isValidHexColor(primaryColor) ? primaryColor : "#0e6e68"}
                  onChange={(event) => setPrimaryColor(event.target.value)}
                  className="h-10 w-14 flex-none cursor-pointer rounded-md border border-line bg-surface"
                />
                <input
                  id="primaryColor"
                  name="primaryColor"
                  value={primaryColor}
                  onChange={(event) => setPrimaryColor(event.target.value)}
                  className="h-10 flex-1 rounded-md border border-line bg-surface px-3 font-mono text-sm text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                />
              </div>
              {fieldErrors.primaryColor && (
                <p className="text-xs font-medium text-danger">{fieldErrors.primaryColor}</p>
              )}
              <p className="text-xs text-fg-subtle">
                Used for buttons, links and highlights. It must be dark enough to read as text on
                white.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                name="phone"
                label="Phone"
                defaultValue={initialSettings?.phone ?? ""}
                error={fieldErrors.phone}
              />
              <InputField
                name="email"
                label="Email"
                type="email"
                defaultValue={initialSettings?.email ?? ""}
                error={fieldErrors.email}
              />
            </div>

            <InputField
              name="address"
              label="Address"
              defaultValue={initialSettings?.address ?? ""}
              error={fieldErrors.address}
            />

            <InputField
              name="website"
              label="Website"
              placeholder="https://"
              defaultValue={initialSettings?.website ?? ""}
              error={fieldErrors.website}
            />

            <Button type="submit" loading={isPending} className="self-start">
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Upload panel shared by the logo and the school photograph.
 *
 * Uploading posts FormData straight to a Server Action — a file can't cross
 * that boundary any other way — and shows a local preview immediately so the
 * result is visible before the round trip finishes.
 */
function ImageUploader({
  kind,
  title,
  description,
  hint,
  currentUrl,
  accept,
  preview,
}: {
  kind: ImageKind;
  title: string;
  description: string;
  hint: string;
  currentUrl: string | null;
  accept: string;
  preview: "square" | "wide";
}) {
  const router = useRouter();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(currentUrl);
  const [busy, setBusy] = useState(false);

  async function onChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setBusy(true);
    // Shown straight away; replaced by the stored URL once the upload lands.
    const localPreview = URL.createObjectURL(file);
    setUrl(localPreview);

    try {
      const formData = new FormData();
      formData.append("kind", kind);
      formData.append("file", file);

      const result = await uploadBrandingImage(formData);
      if (result.ok) {
        setUrl(result.data.url);
        toast.success(result.message ?? "Uploaded.");
        router.refresh();
      } else {
        setUrl(currentUrl);
        toast.error(result.error);
      }
    } catch {
      setUrl(currentUrl);
      toast.error("Could not upload that image. Check your connection and try again.");
    } finally {
      URL.revokeObjectURL(localPreview);
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function onRemove() {
    setBusy(true);
    const result = await removeBrandingImage({ kind });
    setBusy(false);

    if (result.ok) {
      setUrl(null);
      toast.success(result.message ?? "Removed.");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold text-fg">{title}</h2>
          <p className="mt-0.5 text-sm text-fg-subtle">{description}</p>
        </div>

        <div className={cn("flex gap-4", preview === "wide" ? "flex-col" : "items-center")}>
          <div
            className={cn(
              "flex flex-none items-center justify-center overflow-hidden rounded-xl border border-line bg-surface-sunken",
              preview === "wide" ? "aspect-[3/1] w-full max-w-lg" : "h-16 w-16"
            )}
          >
            {url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="px-2 text-center text-xs text-fg-subtle">
                {preview === "wide" ? "No photo yet" : "No logo"}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={busy}
                onClick={() => inputRef.current?.click()}
              >
                <ImageUp className="h-4 w-4" aria-hidden="true" />
                {url ? "Replace" : "Upload"}
              </Button>

              {url && (
                <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={onRemove}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Remove
                </Button>
              )}
            </div>
            <p className="text-xs text-fg-subtle">{hint}</p>
          </div>
        </div>

        <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={onChange} />
      </CardContent>
    </Card>
  );
}
