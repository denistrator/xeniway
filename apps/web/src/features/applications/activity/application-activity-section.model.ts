import type { ApplicationEvent, ApplicationEventInput } from "@xeniway/shared";
import { useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDirtyEditor } from "../../../lib/dirty-editors";
import { useApplicationEventMutations } from "../../../lib/queries";
import { useCanMutate } from "../../offline/offline-access.model";
import { applicationActivitySectionStyles } from "./application-activity-section.styles";

const styles = applicationActivitySectionStyles();

export function useApplicationActivitySection(applicationId: number, className?: string) {
  const { t } = useTranslation();
  const canMutate = useCanMutate();
  const headingId = useId();
  const mutations = useApplicationEventMutations(applicationId);
  const [editing, setEditing] = useState<ApplicationEvent | "new" | null>(null);
  const [deleting, setDeleting] = useState<ApplicationEvent | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [hasWarning, setHasWarning] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const addButton = useRef<HTMLButtonElement>(null);
  const editingTrigger = useRef<HTMLElement | null>(null);
  const pendingEditor = useRef<ApplicationEvent | "new" | null>(null);
  const warningReturnFocus = useRef<HTMLElement | null>(null);
  const saveRequest = useRef<() => Promise<boolean>>(() => Promise.resolve(false));

  function beginAdd() {
    requestEditor("new", addButton.current);
  }

  function beginEdit(event: ApplicationEvent) {
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    requestEditor(event, trigger);
  }

  function requestEditor(target: ApplicationEvent | "new", trigger: HTMLElement | null) {
    if (!editing || !hasUnsavedChanges) {
      activateEditor(target, trigger);
      return;
    }
    pendingEditor.current = target;
    setHasWarning(true);
  }

  function activateEditor(target: ApplicationEvent | "new", trigger: HTMLElement | null) {
    editingTrigger.current = trigger;
    setEditing(target);
    setHasUnsavedChanges(false);
  }

  function finishEditor() {
    const nextEditor = pendingEditor.current;
    pendingEditor.current = null;
    setHasWarning(false);
    if (nextEditor) {
      activateEditor(nextEditor, null);
      return;
    }
    closeForm();
  }

  function closeForm() {
    setEditing(null);
    setHasUnsavedChanges(false);
    returnFocus(editingTrigger.current);
    editingTrigger.current = null;
  }

  function cancelDelete() {
    setDeleting(null);
  }

  function returnFocus(target: HTMLElement | null) {
    if (target?.matches(":disabled")) {
      target.closest("section")?.focus();
    } else {
      target?.focus();
    }
  }

  async function save(input: ApplicationEventInput) {
    if (editing && editing !== "new") {
      await mutations.update.mutateAsync({ eventId: editing.id, input });
    } else {
      await mutations.create.mutateAsync(input);
    }
    finishEditor();
    return true;
  }

  async function remove() {
    if (!deleting) {
      return;
    }
    try {
      await mutations.remove.mutateAsync(deleting.id);
      cancelDelete();
      setDeleteError(false);
    } catch {
      cancelDelete();
      setDeleteError(true);
    }
  }

  function confirmDelete() {
    if (canMutate) {
      void remove();
    }
  }

  const editorPending = mutations.create.isPending || mutations.update.isPending;
  useDirtyEditor({
    id: `application-${applicationId}-activity`,
    dirty: editing !== null && hasUnsavedChanges,
    pending: editing !== null && editorPending,
    discard: closeForm,
    save: () => saveRequest.current(),
  });

  return {
    styles,
    rootClassName: styles.root({ className }),
    headingId,
    actionsDisabled: !canMutate,
    deleteDisabled: !canMutate || mutations.remove.isPending,
    formKey: editing === "new" ? "new" : editing?.id,
    editedEvent: editing === "new" ? undefined : (editing ?? undefined),
    heading: t("applications.activity.heading"),
    addLabel: t("applications.activity.add"),
    deleteErrorLabel: t("applications.activity.deleteFailed"),
    confirmationTitle: t("applications.confirmation.title"),
    confirmationText: t("applications.activity.deleteConfirmation"),
    yesLabel: t("common.actions.yes"),
    noLabel: t("common.actions.no"),
    unsavedChangesTitle: t("applications.workspace.unsavedChangesTitle"),
    unsavedChangesText: t("applications.workspace.unsavedRecordChangesText"),
    saveChangesLabel: t("applications.workspace.actions.saveChanges"),
    discardChangesLabel: t("applications.workspace.actions.discardChanges"),
    dismissWarning: {
      label: t("applications.workspace.actions.keepEditing"),
      onDismiss() {
        pendingEditor.current = null;
        setHasWarning(false);
      },
    },
    confirmDelete,
    mutations,
    editing,
    deleting,
    setDeleting,
    deleteError,
    addButton,
    beginAdd,
    beginEdit,
    closeForm,
    discardWarning: finishEditor,
    warningReturnFocus,
    hasWarning,
    setHasUnsavedChanges(isDirty: boolean, focusedField: HTMLElement) {
      warningReturnFocus.current = focusedField;
      setHasUnsavedChanges(isDirty);
    },
    requestSave() {
      return saveRequest.current();
    },
    setSaveRequest(request: () => Promise<boolean>) {
      saveRequest.current = request;
    },
    cancelDelete,
    save,
    remove,
  };
}
