import { type CreateApplicationInput, createApplicationInputSchema, type JobApplication } from "@job-tracker/shared";
import {
  Banknote,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CircleDot,
  FileText,
  Link,
  MapPin,
  StickyNote,
} from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/button";
import { FloatingLabel } from "../ui/floating-label";
import { Input } from "../ui/input";
import { getStatusLabel, jobStatuses } from "./job-status";

type FormState = {
  company: string;
  position: string;
  location: string;
  salary: string;
  jobUrl: string;
  description: string;
  status: CreateApplicationInput["status"];
  appliedAt: string;
  notes: string;
};

const emptyForm: FormState = {
  company: "",
  position: "",
  location: "",
  salary: "",
  jobUrl: "",
  description: "",
  status: "saved",
  appliedAt: "",
  notes: "",
};

function toForm(job?: JobApplication | null): FormState {
  return job
    ? {
        company: job.company,
        position: job.position,
        location: job.location ?? "",
        salary: job.salary ?? "",
        jobUrl: job.jobUrl ?? "",
        description: job.description ?? "",
        status: job.status,
        appliedAt: job.appliedAt ?? "",
        notes: job.notes ?? "",
      }
    : emptyForm;
}

export function JobForm({
  job,
  submitting,
  onSubmit,
  onArchive,
  onBlacklist,
  blacklisting = false,
}: {
  job?: JobApplication | null;
  submitting: boolean;
  onSubmit: (input: CreateApplicationInput) => void;
  onArchive?: () => void;
  onBlacklist?: (reason: string) => void;
  blacklisting?: boolean;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState>(() => toForm(job));
  const [error, setError] = useState<string | null>(null);
  const [blacklistOpen, setBlacklistOpen] = useState(false);
  const [blacklistReason, setBlacklistReason] = useState("");
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => setForm(toForm(job)), [job]);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  function update(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = createApplicationInputSchema.safeParse({
      ...form,
      location: form.location || null,
      salary: form.salary || null,
      jobUrl: form.jobUrl || null,
      description: form.description || null,
      appliedAt: form.appliedAt || null,
      notes: form.notes || null,
    });
    if (!parsed.success) {
      setError(t("applications.form.checkDetails"));
      return;
    }
    setError(null);
    onSubmit(parsed.data);
  }

  return (
    <form
      className="space-y-4 flex flex-col grow"
      onSubmit={handleSubmit}
      aria-describedby={error ? "application-form-error" : undefined}
      autoComplete="off"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FloatingLabel htmlFor="job-company" label={t("applications.form.company")} icon={Building2}>
          <Input
            id="job-company"
            className="peer"
            name="company"
            placeholder=" "
            required
            value={form.company}
            onChange={(event) => update("company", event.target.value)}
          />
        </FloatingLabel>
        <FloatingLabel htmlFor="job-position" label={t("applications.form.position")} icon={BriefcaseBusiness}>
          <Input
            id="job-position"
            className="peer"
            name="position"
            placeholder=" "
            required
            value={form.position}
            onChange={(event) => update("position", event.target.value)}
          />
        </FloatingLabel>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FloatingLabel htmlFor="job-location" label={t("applications.form.location")} icon={MapPin}>
          <Input
            id="job-location"
            className="peer"
            name="location"
            placeholder=" "
            value={form.location}
            onChange={(event) => update("location", event.target.value)}
          />
        </FloatingLabel>
        <FloatingLabel htmlFor="job-salary" label={t("applications.form.salary")} icon={Banknote}>
          <Input
            id="job-salary"
            className="peer"
            name="salary"
            placeholder=" "
            value={form.salary}
            onChange={(event) => update("salary", event.target.value)}
          />
        </FloatingLabel>
      </div>
      <FloatingLabel htmlFor="job-url" label={t("applications.form.jobUrl")} icon={Link}>
        <Input
          id="job-url"
          className="peer"
          name="jobUrl"
          placeholder=" "
          type="url"
          value={form.jobUrl}
          onChange={(event) => update("jobUrl", event.target.value)}
        />
      </FloatingLabel>
      <div className="grid gap-4 sm:grid-cols-2">
        <FloatingLabel htmlFor="job-status" label={t("applications.form.status")} icon={CircleDot}>
          <select
            id="job-status"
            className="peer"
            name="status"
            value={form.status}
            onChange={(event) => update("status", event.target.value as FormState["status"])}
          >
            {jobStatuses.map((status) => (
              <option key={status} value={status}>
                {getStatusLabel(t, status)}
              </option>
            ))}
          </select>
        </FloatingLabel>
        <FloatingLabel htmlFor="job-applied-at" label={t("applications.form.appliedDate")} icon={CalendarDays}>
          <Input
            id="job-applied-at"
            className="peer"
            name="appliedAt"
            placeholder=" "
            type="date"
            value={form.appliedAt}
            onChange={(event) => update("appliedAt", event.target.value)}
          />
        </FloatingLabel>
      </div>
      <FloatingLabel htmlFor="job-description" label={t("applications.form.description")} icon={FileText}>
        <textarea
          id="job-description"
          className="peer min-h-24"
          name="description"
          placeholder=" "
          value={form.description}
          onChange={(event) => update("description", event.target.value)}
        />
      </FloatingLabel>
      <FloatingLabel htmlFor="job-notes" label={t("applications.form.notes")} icon={StickyNote}>
        <textarea
          id="job-notes"
          className="peer min-h-24"
          name="notes"
          placeholder=" "
          value={form.notes}
          onChange={(event) => update("notes", event.target.value)}
        />
      </FloatingLabel>
      {job && onBlacklist && blacklistOpen && (
        <div className="border-t border-line pt-5">
          <div className="space-y-3">
            <FloatingLabel htmlFor="job-blacklist-reason" label={t("applications.form.reason")} icon={StickyNote}>
              <textarea
                id="job-blacklist-reason"
                className="peer min-h-24"
                name="blacklistReason"
                placeholder=" "
                maxLength={1000}
                value={blacklistReason}
                onChange={(event) => setBlacklistReason(event.target.value)}
              />
            </FloatingLabel>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setBlacklistOpen(false)}>
                {t("applications.form.cancel")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onBlacklist(blacklistReason)}
                disabled={blacklisting}
              >
                {blacklisting ? t("applications.form.blacklisting") : t("applications.form.confirmBlacklist")}
              </Button>
            </div>
          </div>
        </div>
      )}
      {error && (
        <p
          ref={errorRef}
          id="application-form-error"
          role="alert"
          aria-live="assertive"
          tabIndex={-1}
          className="text-sm text-rose-600 dark:text-rose-400"
        >
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2 mt-auto">
        <Button type="submit" disabled={submitting}>
          {submitting ? t("applications.form.saving") : t("applications.form.save")}
        </Button>
        {job && onBlacklist && !blacklistOpen && (
          <Button type="button" variant="outline" onClick={() => setBlacklistOpen(true)}>
            {t("applications.form.blacklist")}
          </Button>
        )}
        {job && onArchive && (
          <Button type="button" variant="outline" onClick={onArchive}>
            {t("applications.form.archive")}
          </Button>
        )}
      </div>
    </form>
  );
}
