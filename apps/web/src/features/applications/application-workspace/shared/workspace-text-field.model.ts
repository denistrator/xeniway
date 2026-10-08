import type { ChangeEvent, KeyboardEvent } from "react";

import { useTranslation } from "react-i18next";

import { useCanMutate } from "../../../offline/offline-access.view";
import { useInlineEditFocus } from "./use-inline-edit-focus";
import { workspaceTextFieldStyles } from "./workspace-text-field.styles";

const styles = workspaceTextFieldStyles();
export type WorkspaceTextFieldProps = {
  id: string;
  label: string;
  headingLevel: 2 | 3;
  className: string;
  headingClassName: string;
  controller: WorkspaceTextFieldController;
  feedback: WorkspaceFieldFeedback;
};
export type WorkspaceTextFieldController = {
  savedValue: string | null;
  draft: string;
  editing: boolean;
  pending: boolean;
  state: "error" | "invalid" | null;
  setDraft(value: string): void;
  beginEdit(): void;
  cancel(): void;
  save(value?: string): Promise<unknown>;
};
export type WorkspaceFieldFeedback = {
  kind: "error" | "invalid";
  text: string;
} | null;

export function useWorkspaceTextField({
  id,
  label,
  headingLevel,
  className,
  headingClassName,
  controller,
  feedback,
}: WorkspaceTextFieldProps) {
  const { t } = useTranslation();
  const canMutate = useCanMutate();
  const focus = useInlineEditFocus<HTMLElement, HTMLTextAreaElement>(controller.editing, true, canMutate);
  const Heading: "h2" | "h3" = headingLevel === 2 ? "h2" : "h3";
  const hasError = feedback?.kind === "error" || feedback?.kind === "invalid";

  function bindInputRef(ref: { current: HTMLTextAreaElement | null }) {
    return (element: HTMLTextAreaElement | null) => {
      ref.current = element;
      focus.input.current = element;
    };
  }
  function bindChange(fieldProps: { onChange(value: string): void }) {
    return (event: ChangeEvent<HTMLTextAreaElement>) => {
      fieldProps.onChange(event.target.value);
      controller.setDraft(event.target.value);
    };
  }
  function beginEdit() {
    if (canMutate) {
      controller.beginEdit();
    }
  }
  function confirmEdit(value: string) {
    if (canMutate) {
      void controller.save(value);
    }
  }
  function cancelEdit() {
    controller.cancel();
  }
  function cancelOnEscape(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelEdit();
    }
  }
  const saveNamed = t("applications.workspace.saveNamed", { name: label.toLowerCase() });
  const readValue = controller.savedValue || t("applications.workspace.notProvided");
  const slotClasses = {
    readView: styles.readView(),
    value: styles.value(),
    editLabel: styles.editLabel(),
    root: styles.root({ className }),
    heading: styles.heading({ className: headingClassName }),
    input: styles.input(),
    feedback: styles.feedback({ error: hasError }),
  };
  const editLabel = t("applications.workspace.actions.edit");
  const cancelLabel = t("applications.workspace.actions.cancel");
  const saveLabel = t("applications.workspace.actions.save");

  const savingLabel = t("applications.workspace.actions.saving");
  return {
    slotClasses,
    readValue,
    canMutate,
    editLabel,
    focus,
    id,
    Heading,
    label,
    controller,
    saveNamed,
    cancelLabel,
    bindInputRef,
    bindChange,
    hasError,
    beginEdit,
    confirmEdit,
    saveLabel,
    cancelOnEscape,
    feedback,
    savingLabel,
  };
}
