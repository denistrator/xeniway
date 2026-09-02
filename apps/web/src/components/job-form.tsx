import { type CreateApplicationInput, createApplicationInputSchema, type JobApplication } from "@job-tracker/shared";
import { type FormEvent, useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const statuses = ["saved", "applied", "interview", "offer", "rejected", "withdrawn"] as const;

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
  onCancel,
}: {
  job?: JobApplication | null;
  submitting: boolean;
  onSubmit: (input: CreateApplicationInput) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => toForm(job));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setForm(toForm(job)), [job]);

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
      setError(parsed.error.issues[0]?.message ?? "Check the application details");
      return;
    }
    setError(null);
    onSubmit(parsed.data);
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm font-medium">
          Company *<Input required value={form.company} onChange={(event) => update("company", event.target.value)} />
        </label>
        <label className="space-y-1 text-sm font-medium">
          Position *
          <Input required value={form.position} onChange={(event) => update("position", event.target.value)} />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm font-medium">
          Location
          <Input value={form.location} onChange={(event) => update("location", event.target.value)} />
        </label>
        <label className="space-y-1 text-sm font-medium">
          Salary
          <Input value={form.salary} onChange={(event) => update("salary", event.target.value)} />
        </label>
      </div>
      <label className="block space-y-1 text-sm font-medium">
        Job URL
        <Input type="url" value={form.jobUrl} onChange={(event) => update("jobUrl", event.target.value)} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm font-medium">
          Status
          <select
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            value={form.status}
            onChange={(event) => update("status", event.target.value)}
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status[0].toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm font-medium">
          Applied date
          <Input type="date" value={form.appliedAt} onChange={(event) => update("appliedAt", event.target.value)} />
        </label>
      </div>
      <label className="block space-y-1 text-sm font-medium">
        Description
        <textarea
          className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          value={form.description}
          onChange={(event) => update("description", event.target.value)}
        />
      </label>
      <label className="block space-y-1 text-sm font-medium">
        Notes
        <textarea
          className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          value={form.notes}
          onChange={(event) => update("notes", event.target.value)}
        />
      </label>
      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Save application"}
        </Button>
      </div>
    </form>
  );
}
