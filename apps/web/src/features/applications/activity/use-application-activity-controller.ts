import type { ApplicationEvent, ApplicationEventInput } from "@xeniway/shared";
import { useRef, useState } from "react";
import { useApplicationEventMutations } from "../../../lib/queries";

export function useApplicationActivityController(applicationId: number) {
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
    editingTrigger.current?.focus();
    editingTrigger.current = null;
  }

  function cancelDelete() {
    setDeleting(null);
    addButton.current?.focus();
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
    if (!deleting) return;
    try {
      await mutations.remove.mutateAsync(deleting.id);
      cancelDelete();
      setDeleteError(false);
    } catch {
      cancelDelete();
      setDeleteError(true);
    }
  }

  return {
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
