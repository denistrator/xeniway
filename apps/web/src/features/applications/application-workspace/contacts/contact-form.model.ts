import type { ChangeEvent } from "react";
import { type FormEvent, useId } from "react";
import { useTranslation } from "react-i18next";

import { useCanMutate } from "../../../offline/offline-access.view";
import { contactFormStyles } from "./contact-form.styles";
import type { ContactsController } from "./use-contacts-controller";

const styles = contactFormStyles();
function getContactInputAttributes(field: "name" | "role" | "email" | "phone" | "profileUrl") {
  let type = "text";
  let autoComplete = "off";
  let maxLength = 255;
  switch (field) {
    case "name":
      autoComplete = "name";
      break;
    case "email":
      type = "email";
      autoComplete = "email";
      break;
    case "phone":
      type = "tel";
      autoComplete = "tel";
      maxLength = 100;
      break;
    case "profileUrl":
      type = "url";
      maxLength = 500;
      break;
  }
  return { type, autoComplete, maxLength };
}

export type ContactFormProps = { controller: ContactsController };
export function useContactForm({ controller }: ContactFormProps) {
  const { t } = useTranslation();
  const canMutate = useCanMutate();
  const formId = useId();
  const { editor } = controller;
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (canMutate) {
      void editor.submit(event);
    } else {
      event.preventDefault();
    }
  }
  const heading = t(
    editor.target === "new" ? "applications.workspace.contacts.add" : "applications.workspace.contacts.edit",
  );
  const fields = (["name", "role", "email", "phone", "profileUrl"] as const).map((field) => ({
    field,
    id: `${formId}-${field}`,
    label: t(`applications.workspace.contacts.${field}`),
    attributes: getContactInputAttributes(field),
    required: field === "name" || field === "role",
    invalid: Boolean(editor.errors[field]),
    error: editor.errors[field] ? t(`applications.workspace.validation.${editor.errors[field]}`) : null,
    errorId: `${formId}-${field}-error`,
    fieldClassName: styles.field({ profile: field === "profileUrl" }),
    inputClassName: styles.input({ invalid: Boolean(editor.errors[field]) }),
    onChange(event: ChangeEvent<HTMLInputElement>) {
      editor.setField(field, event.target.value);
    },
  }));
  const slotClasses = { notes: styles.notes({ invalid: Boolean(editor.errors.notes) }) };
  const notesError = editor.errors.notes ? t(`applications.workspace.validation.${editor.errors.notes}`) : null;
  function changeNotes(event: ChangeEvent<HTMLTextAreaElement>) {
    editor.setField("notes", event.target.value);
  }
  const notesLabel = t("applications.workspace.contacts.notes");
  const saveLabel = t("applications.workspace.contacts.save");
  const savingLabel = t("applications.workspace.actions.saving");
  const cancelLabel = t("applications.workspace.actions.cancel");
  return {
    editor,
    handleSubmit,
    heading,
    fields,
    canMutate,
    formId,
    notesLabel,
    changeNotes,
    slotClasses,
    notesError,
    controller,
    saveLabel,
    savingLabel,
    cancelLabel,
  };
}
