import type { ApplicationEvent, ApplicationEventInput } from "@xeniway/shared";
import { useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
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
  const [deleteError, setDeleteError] = useState(false);
  const addButton = useRef<HTMLButtonElement>(null);
  const editingTrigger = useRef<HTMLElement | null>(null);

  function beginAdd() {
    editingTrigger.current = addButton.current;
    setEditing("new");
  }

  function beginEdit(event: ApplicationEvent) {
    editingTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setEditing(event);
  }

  function closeForm() {
    setEditing(null);
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
    closeForm();
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
    cancelDelete,
    save,
    remove,
  };
}
