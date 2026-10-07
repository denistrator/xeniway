import type { ChangeEvent, FormEvent } from "react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { fieldErrorStyles } from "../../../../components/ui/field-styles.ts";

import { useCanMutate } from "../../../offline/offline-access.tsx";
import { followUpFormStyles } from "./follow-up-form.styles.ts";
import type { FollowUpsController } from "./use-follow-ups-controller.ts";

const styles = followUpFormStyles();

export type FollowUpFormProps = { controller: FollowUpsController };
export function useFollowUpForm({ controller }: FollowUpFormProps) {
  const { t } = useTranslation();
  const canMutate = useCanMutate();
  const formId = useId();
  const { editor } = controller;
  const heading = t(
    editor.target === "new" ? "applications.workspace.followUps.add" : "applications.workspace.followUps.edit",
  );
  const slotClasses = {
    titleInput: styles.titleInput({ className: fieldErrorStyles({ invalid: Boolean(editor.errors.title) }) }),
    dateInput: styles.dateInput({ className: fieldErrorStyles({ invalid: Boolean(editor.errors.dueDate) }) }),
  };
  const titleError = editor.errors.title ? t(`applications.workspace.validation.${editor.errors.title}`) : null;
  const dateError = editor.errors.dueDate ? t(`applications.workspace.validation.${editor.errors.dueDate}`) : null;
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (canMutate) {
      void editor.submit(event);
    } else {
      event.preventDefault();
    }
  }
  function changeTitle(event: ChangeEvent<HTMLInputElement>) {
    editor.setTitle(event.target.value);
  }
  function changeDueDate(event: ChangeEvent<HTMLInputElement>) {
    editor.setDueDate(event.target.value);
  }
  function changeNotes(event: ChangeEvent<HTMLTextAreaElement>) {
    editor.setNotes(event.target.value);
  }
  const taskLabel = t("applications.workspace.followUps.task");
  const dueDateLabel = t("applications.workspace.followUps.dueDate");
  const notesLabel = t("applications.workspace.followUps.notes");
  const saveLabel = t("applications.workspace.followUps.save");
  const savingLabel = t("applications.workspace.actions.saving");
  const cancelLabel = t("applications.workspace.actions.cancel");
  return {
    editor,
    handleSubmit,
    heading,
    formId,
    taskLabel,
    canMutate,
    slotClasses,
    changeTitle,
    titleError,
    dueDateLabel,
    changeDueDate,
    dateError,
    notesLabel,
    changeNotes,
    controller,
    saveLabel,
    savingLabel,
    cancelLabel,
  };
}
