import type { ChangeEvent, FocusEvent, HTMLInputTypeAttribute, KeyboardEvent, ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { useCanMutate } from "../../../offline/offline-access.tsx";
import { useInlineEditFocus } from "../shared/use-inline-edit-focus.ts";
import { applicationCompactFieldStyles } from "./application-compact-field.styles.ts";
import { getApplicationFieldFeedback } from "./application-field-feedback.ts";
import type { EditableApplicationField } from "./use-application-field.ts";
import type { ApplicationFieldsController } from "./use-application-fields.ts";

const styles = applicationCompactFieldStyles();
export type ApplicationCompactFieldProps = {
  fields: ApplicationFieldsController;
  field: EditableApplicationField;
  id: string;
  label: string;
  type: HTMLInputTypeAttribute;
  maxLength: number;
  required: boolean;
  showLabel: boolean;
  displayValue: ReactNode;
};

export function useApplicationCompactField({
  fields,
  field,
  id,
  label,
  type,
  maxLength,
  required,
  showLabel,
  displayValue,
}: ApplicationCompactFieldProps) {
  const { t } = useTranslation();
  const canMutate = useCanMutate();
  const controller = fields.fields[field];
  const editing = controller.editing && fields.compact.activeField === field;
  const focus = useInlineEditFocus<HTMLDivElement, HTMLInputElement>(
    controller.editing && fields.compact.activeField === field,
    fields.compact.activeField === null,
    canMutate,
  );
  const accessibleLabel = label.replace(/\s*\*$/, "");
  const feedback = getApplicationFieldFeedback(controller, label, t);
  const hasError = feedback?.kind === "error" || feedback?.kind === "invalid";
  function handleBlur(event: FocusEvent<HTMLInputElement>) {
    const target = event.relatedTarget;
    if (target instanceof Node && event.currentTarget.form?.contains(target)) {
      return;
    }
    const requestedField =
      target instanceof HTMLElement
        ? target.closest<HTMLElement>("[data-compact-edit-field]")?.dataset.compactEditField
        : undefined;
    if (fields.compact.warningField !== field) {
      fields.compact.blur(field, requestedField as EditableApplicationField | undefined);
    }
  }
  function bindInputRef(ref: { current: HTMLInputElement | null }) {
    return (element: HTMLInputElement | null) => {
      ref.current = element;
      focus.input.current = element;
    };
  }
  function bindChange(fieldProps: { onChange(value: string): void }) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      fieldProps.onChange(event.target.value);
      controller.setDraft(event.target.value);
    };
  }
  function beginEdit() {
    if (canMutate) {
      fields.compact.requestEdit(field);
    }
  }
  function confirmEdit(value: string) {
    if (canMutate) {
      fields.compact.save(field, value);
    }
  }
  function cancelEdit() {
    fields.compact.cancel(field);
  }
  function cancelOnEscape(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelEdit();
    }
  }
  const saveNamed = t("applications.workspace.saveNamed", { name: accessibleLabel.toLowerCase() });
  const readValue = displayValue || controller.savedValue || t("applications.workspace.notProvided");
  const slotClasses = { value: styles.value({ showLabel }), feedback: styles.feedback({ error: hasError }) };
  const editLabel = t("applications.workspace.actions.edit");
  const cancelLabel = t("applications.workspace.actions.cancel");
  const saveLabel = t("applications.workspace.actions.save");

  return {
    showLabel,
    label,
    slotClasses,
    readValue,
    focus,
    field,
    canMutate,
    editing,
    controller,
    fields,
    required,
    accessibleLabel,
    editLabel,
    saveNamed,
    cancelLabel,
    id,
    bindInputRef,
    type,
    maxLength,
    bindChange,
    handleBlur,
    hasError,
    beginEdit,
    confirmEdit,
    cancelEdit,
    saveLabel,
    cancelOnEscape,
    feedback,
  };
}
