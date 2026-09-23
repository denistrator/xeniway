import { type CreateApplicationInput, createApplicationInputSchema, type JobApplication } from "@xeniway/shared";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { type ApplicationFormState, applicationToForm, normalizeApplicationForm } from "./application-form";

export type FormState = ApplicationFormState;

export function useJobForm({
  job,
  onSubmit,
}: {
  job?: JobApplication | null;
  onSubmit: (input: CreateApplicationInput) => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState>(() => applicationToForm(job));
  const [error, setError] = useState<string | null>(null);
  const [blacklistOpen, setBlacklistOpen] = useState(false);
  const [blacklistReason, setBlacklistReason] = useState("");
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => setForm(applicationToForm(job)), [job]);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  function update(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = createApplicationInputSchema.safeParse(normalizeApplicationForm(form));
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
