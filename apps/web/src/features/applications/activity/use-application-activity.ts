import type { ApplicationEvent, ApplicationEventInput } from "@xeniway/shared";
import { useRef, useState } from "react";
import { useApplicationDetail, useApplicationEventMutations } from "../../../lib/queries";

export function useApplicationActivity(applicationId: number) {
  const detail = useApplicationDetail(applicationId);
  const mutations = useApplicationEventMutations(applicationId);
  const [editing, setEditing] = useState<ApplicationEvent | "new" | null>(null);
  const [deleting, setDeleting] = useState<ApplicationEvent | null>(null);
  const [deleteError, setDeleteError] = useState(false);
  const addButton = useRef<HTMLButtonElement>(null);
  const editingTrigger = useRef<HTMLElement | null>(null);

  const beginAdd = () => {
    editingTrigger.current = addButton.current;
    setEditing("new");
  };
  const beginEdit = (event: ApplicationEvent) => {
    editingTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setEditing(event);
  };

  const closeForm = () => {
    setEditing(null);
    editingTrigger.current?.focus();
    editingTrigger.current = null;
  };
  const cancelDelete = () => {
    setDeleting(null);
    addButton.current?.focus();
  };
  const save = async (input: ApplicationEventInput) => {
    if (editing && editing !== "new") {
      await mutations.update.mutateAsync({ eventId: editing.id, input });
    } else {
      await mutations.create.mutateAsync(input);
    }
    closeForm();
  };
  const remove = async () => {
    if (!deleting) return;
    try {
      await mutations.remove.mutateAsync(deleting.id);
      cancelDelete();
      setDeleteError(false);
    } catch {
      cancelDelete();
      setDeleteError(true);
    }
  };

  return {
    detail,
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
