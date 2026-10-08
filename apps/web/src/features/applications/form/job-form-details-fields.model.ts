import type { ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { getStatusLabel, jobStatuses } from "../board/job-status";
import type { ApplicationFormState as FormState } from "./application-form";

export type JobFormDetailsFieldsProps = {
  form: FormState;
  update: (field: keyof FormState, value: string) => void;
};

export function useJobFormDetailsFieldsPresentation({ update }: JobFormDetailsFieldsProps) {
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
  };
}
