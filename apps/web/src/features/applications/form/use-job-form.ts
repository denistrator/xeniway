import { type CreateApplicationInput, createApplicationInputSchema } from "@xeniway/shared";
import type { TFunction } from "i18next";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  type ApplicationFormErrors,
  type ApplicationFormState,
  emptyApplicationForm,
  normalizeApplicationForm,
} from "./application-form";

export type FormState = ApplicationFormState;
export type JobFormController = ReturnType<typeof useJobForm>;

const fieldIds: Record<keyof FormState, string> = {
  company: "job-company",
  position: "job-position",
  location: "job-location",
  salary: "job-salary",
  jobUrl: "job-url",
  description: "job-description",
  status: "job-status",
  appliedAt: "job-applied-at",
  notes: "job-notes",
};

function getValidationMessage(issue: { code: string; maximum?: number | bigint }, t: TFunction) {
  switch (issue.code) {
    case "too_small": {
      return t("applications.form.required");
    }
    case "too_big": {
      return t("applications.form.tooLong", { max: issue.maximum });
    }
    case "invalid_format": {
      return t("applications.form.urlInvalid");
    }
    default: {
      return t("applications.form.checkDetails");
    }
  }
}

function getFieldErrors(
  issues: readonly { code: string; maximum?: number | bigint; path: readonly PropertyKey[] }[],
  form: FormState,
  t: TFunction,
) {
  const errors: ApplicationFormErrors = {};

  for (const issue of issues) {
    const field = issue.path[0];
    const isKnownField = typeof field === "string" && field in form;
    if (!isKnownField) {
      continue;
    }

    const applicationField = field as keyof FormState;
    if (errors[applicationField]) {
      continue;
    }

    errors[applicationField] = getValidationMessage(issue, t);
  }

  return errors;
}

export function useJobForm({ onSubmit }: { onSubmit: (input: CreateApplicationInput) => void }) {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState>(emptyApplicationForm);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ApplicationFormErrors>({});
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (error) {
      errorRef.current?.focus();
    }
  }, [error]);

  useEffect(() => {
    const firstInvalidField = Object.keys(fieldErrors)[0] as keyof FormState | undefined;
    if (firstInvalidField) {
      document.getElementById(fieldIds[firstInvalidField])?.focus();
    }
  }, [fieldErrors]);

  function update(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      if (!(field in current)) {
        return current;
      }

      const nextErrors = { ...current };
      delete nextErrors[field];
      return nextErrors;
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = createApplicationInputSchema.safeParse(normalizeApplicationForm(form));
    if (!parsed.success) {
      const nextErrors = getFieldErrors(parsed.error.issues, form, t);
      const hasFieldErrors = Object.keys(nextErrors).length > 0;
      setFieldErrors(nextErrors);
      setError(hasFieldErrors ? null : t("applications.form.checkDetails"));
      return;
    }
    setFieldErrors({});
    setError(null);
    onSubmit(parsed.data);
  }

  return {
    form,
    update,
    handleSubmit,
    error,
    fieldErrors,
    errorRef,
  };
}
