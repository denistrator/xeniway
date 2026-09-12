import { type CreateApplicationInput, createApplicationInputSchema, type JobApplication } from "@xeniway/shared";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export type FormState = {
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

export function useJobForm({
  job,
  onSubmit,
}: {
  job?: JobApplication | null;
  onSubmit: (input: CreateApplicationInput) => void;
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

  return {
    form,
    update,
    handleSubmit,
    error,
    errorRef,
    blacklistOpen,
    setBlacklistOpen,
    blacklistReason,
    setBlacklistReason,
  };
}
