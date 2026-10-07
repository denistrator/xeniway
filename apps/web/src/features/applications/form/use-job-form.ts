import { type CreateApplicationInput, createApplicationInputSchema } from "@xeniway/shared";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { type ApplicationFormState, emptyApplicationForm, normalizeApplicationForm } from "./application-form";

export type FormState = ApplicationFormState;

export function useJobForm({ onSubmit }: { onSubmit: (input: CreateApplicationInput) => void }) {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState>(emptyApplicationForm);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (error) {
      errorRef.current?.focus();
    }
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
  };
}
