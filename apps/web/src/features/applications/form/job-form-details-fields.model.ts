import type { ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { getStatusLabel, jobStatuses } from "../board/job-status";
import type { ApplicationFormErrors, ApplicationFormState as FormState } from "./application-form";

export type JobFormDetailsFieldsProps = {
  form: FormState;
  errors: ApplicationFormErrors;
  update: (field: keyof FormState, value: string) => void;
};

function getFieldError(field: keyof FormState, errors: ApplicationFormErrors) {
  const error = errors[field];
  const errorId = error ? `job-${field}-error` : undefined;

  return { error, errorId };
}

export function useJobFormDetailsFieldsPresentation({ errors, update }: JobFormDetailsFieldsProps) {
  const { t } = useTranslation();
  const statusLabel = t("applications.form.status");
  const changeStatus = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    update("status", event.target.value);
  const statusOptions = jobStatuses.map((status) => ({ status, label: getStatusLabel(t, status) }));
  const appliedDateLabel = t("applications.form.appliedDate");
  const changeAppliedDate = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    update("appliedAt", event.target.value);
  const descriptionLabel = t("applications.form.description");
  const changeDescription = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    update("description", event.target.value);
  const notesLabel = t("applications.form.notes");
  const changeNotes = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    update("notes", event.target.value);
  return {
    statusLabel,
    changeStatus,
    statusOptions,
    appliedDateLabel,
    changeAppliedDate,
    descriptionLabel,
    changeDescription,
    notesLabel,
    changeNotes,
    errors: {
      status: getFieldError("status", errors),
      appliedAt: getFieldError("appliedAt", errors),
      description: getFieldError("description", errors),
      notes: getFieldError("notes", errors),
    },
  };
}
