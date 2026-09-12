"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Send, Trash2, Upload, X } from "lucide-react";
import {
  addDatesheetPage,
  publishDatesheet,
  removeDatesheetPage,
  updateDatesheet,
  deleteDatesheet,
} from "@/lib/actions/datesheets";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { ConfirmAction } from "@/components/ui/ConfirmAction";
import { InputField } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

interface EntryDraft {
  subjectName: string;
  examDate: string;
  startTime: string;
  endTime: string;
  room: string;
}

const BLANK: EntryDraft = { subjectName: "", examDate: "", startTime: "", endTime: "", room: "" };

/**
 * The principal's half of a datesheet page: add photographs, type the
 * papers, publish.
 *
 * It sits below the datesheet rather than on a separate edit screen so that
 * what is being published is visible while it is being assembled — the
 * thing most likely to go out wrong is a photograph that turns out to be
 * blurry or the wrong page, and that is only obvious when you can see it.
 */
export function DatesheetAdminPanel({
  datesheetId,
  status,
  pages,
  entries: initialEntries,
  meta,
}: {
  datesheetId: string;
  status: "DRAFT" | "PUBLISHED";
  pages: { id: string; caption: string | null }[];
  entries: EntryDraft[];
  meta: { title: string; audience: string; notes: string; startsOn: string };
}) {
  const [entries, setEntries] = useState<EntryDraft[]>(
    initialEntries.length > 0 ? initialEntries : [BLANK]
  );
  const [notify, setNotify] = useState(true);
  const [uploading, startUpload] = useTransition();
  const [saving, startSave] = useTransition();
  const [publishing, startPublish] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const toast = useToast();

  const hasContent = pages.length > 0 || entries.some((entry) => entry.subjectName.trim());

  function update(index: number, field: keyof EntryDraft, value: string) {
    setEntries((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  function upload(file: File) {
    const formData = new FormData();
    formData.set("datesheetId", datesheetId);
    formData.set("file", file);

    startUpload(async () => {
      const result = await addDatesheetPage(formData);
      if (result.ok) {
        toast.success(result.message ?? "Page added.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  function savePapers() {
    startSave(async () => {
      const result = await updateDatesheet({
        id: datesheetId,
        title: meta.title,
        audience: meta.audience as "ALL",
        sectionId: "",
        termId: "",
        startsOn: meta.startsOn,
        notes: meta.notes,
        // Blank rows are the natural residue of a repeating editor; they
        // are dropped rather than rejected, so an empty trailing row does
        // not turn into a validation error the principal has to clear.
        entries: entries
          .filter((entry) => entry.subjectName.trim() && entry.examDate)
          .map((entry) => ({
            subjectName: entry.subjectName,
            examDate: entry.examDate,
            startTime: entry.startTime,
            endTime: entry.endTime,
            room: entry.room,
          })),
      });

      if (result.ok) {
        toast.success(result.message ?? "Saved.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function publish() {
    startPublish(async () => {
      const result = await publishDatesheet({ id: datesheetId, notify });
      if (result.ok) {
        toast.success(result.message ?? "Published.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6" data-print-hide>
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-line" aria-hidden="true" />
        <span className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
          Principal only
        </span>
        <span className="h-px flex-1 bg-line" aria-hidden="true" />
      </div>

      {/* ---- photographed pages ---- */}
      <Card>
        <CardHeader>
          <CardTitle>Upload the timetable</CardTitle>
          <p className="mt-1 text-sm text-fg-subtle">
            Photograph the exam timetable and upload it — one image per page. This is usually the
            fastest way, and it&apos;s what parents recognise.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/avif"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) upload(file);
            }}
          />
          <div>
            <Button
              variant="secondary"
              onClick={() => fileRef.current?.click()}
              loading={uploading}
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              Add a page
            </Button>
          </div>

          {pages.length > 0 && (
            <ul className="flex flex-col divide-y divide-line">
              {pages.map((page, index) => (
                <li key={page.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                  <span className="text-sm text-fg-muted">Page {index + 1}</span>
                  <span className="flex-1" />
                  <ConfirmAction
                    trigger={{ label: "Remove", icon: X, size: "xs" }}
                    title={`Remove page ${index + 1}?`}
                    confirmLabel="Remove"
                    body="The image is deleted permanently. The rest of the datesheet is unaffected."
                    action={() => removeDatesheetPage({ id: page.id })}
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ---- typed papers ---- */}
      <Card>
        <CardHeader>
          <CardTitle>Or type the papers</CardTitle>
          <p className="mt-1 text-sm text-fg-subtle">
            Typed papers sort themselves by date, stay readable on a phone without zooming, and
            print cleanly. You can do both — a photo of the official notice and the dates typed out
            underneath it.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ul className="flex flex-col gap-3">
            {entries.map((entry, index) => (
              <li
                key={index}
                className="grid gap-2 rounded-lg border border-line p-3 sm:grid-cols-[1.5fr_1fr_0.8fr_0.8fr_0.8fr_auto] sm:items-end"
              >
                <InputField
                  label={index === 0 ? "Paper" : undefined}
                  aria-label="Paper"
                  placeholder="Mathematics"
                  value={entry.subjectName}
                  onChange={(event) => update(index, "subjectName", event.target.value)}
                />
                <InputField
                  label={index === 0 ? "Date" : undefined}
                  aria-label="Date"
                  type="date"
                  value={entry.examDate}
                  onChange={(event) => update(index, "examDate", event.target.value)}
                />
                <InputField
                  label={index === 0 ? "From" : undefined}
                  aria-label="Start time"
                  type="time"
                  value={entry.startTime}
                  onChange={(event) => update(index, "startTime", event.target.value)}
                />
                <InputField
                  label={index === 0 ? "To" : undefined}
                  aria-label="End time"
                  type="time"
                  value={entry.endTime}
                  onChange={(event) => update(index, "endTime", event.target.value)}
                />
                <InputField
                  label={index === 0 ? "Room" : undefined}
                  aria-label="Room"
                  placeholder="Hall A"
                  value={entry.room}
                  onChange={(event) => update(index, "room", event.target.value)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove row ${index + 1}`}
                  onClick={() => setEntries((rows) => rows.filter((_, i) => i !== index))}
                  disabled={entries.length === 1}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => setEntries((rows) => [...rows, BLANK])}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add a paper
            </Button>
            <Button size="sm" onClick={savePapers} loading={saving}>
              Save papers
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ---- publish ---- */}
      <Card>
        <CardHeader>
          <CardTitle>{status === "DRAFT" ? "Publish" : "Republish"}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {status === "DRAFT" ? (
            <Alert variant="warning">
              This is still a draft. Nobody can see it until you publish.
            </Alert>
          ) : (
            <Alert variant="success">
              Published. Everyone it&apos;s addressed to can see it, including any changes you save.
            </Alert>
          )}

          <Checkbox
            label="Notify everyone this datesheet is for"
            hint={
              status === "DRAFT"
                ? "They'll get an alert with the date the examinations begin."
                : "Only tick this if the change is worth interrupting people for."
            }
            checked={notify}
            onChange={(event) => setNotify(event.target.checked)}
          />

          <div className="flex flex-wrap gap-2">
            <Button onClick={publish} loading={publishing} disabled={!hasContent}>
              <Send className="h-4 w-4" aria-hidden="true" />
              {status === "DRAFT" ? "Publish datesheet" : "Republish"}
            </Button>

            <ConfirmAction
              trigger={{ label: "Delete", icon: Trash2, variant: "ghost", size: "sm" }}
              title="Delete this datesheet?"
              confirmLabel="Delete"
              body="The datesheet, its papers and its uploaded pages are all deleted permanently. Anyone who was notified will find the link no longer works."
              action={async () => {
                const result = await deleteDatesheet({ id: datesheetId });
                if (result.ok) router.push("/datesheets");
                return result;
              }}
            />
          </div>

          {!hasContent && (
            <p className="text-sm text-fg-subtle">
              Add a timetable image or at least one paper before publishing.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
