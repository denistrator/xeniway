import {
  type ApplicationFollowUpTask,
  type CreateApplicationFollowUpTaskInput,
  createApplicationFollowUpTaskInputSchema,
  updateApplicationFollowUpTaskInputSchema,
} from "@xeniway/shared";
import { useState } from "react";
import { useApplicationFollowUpMutations } from "../../../lib/queries";

export function useFollowUpsSection(applicationId: number) {
  const mutations = useApplicationFollowUpMutations(applicationId);
  const [editing, setEditing] = useState<ApplicationFollowUpTask | "new" | null>(null);
  const [deleting, setDeleting] = useState<ApplicationFollowUpTask | null>(null);
  const [status, setStatus] = useState<
    "saved" | "completed" | "deleted" | "saveFailed" | "completeFailed" | "deleteFailed" | null
  >(null);
  const [locallyCompleted, setLocallyCompleted] = useState<number[]>([]);
  const pending =
    mutations.create.isPending ||
    mutations.update.isPending ||
    mutations.complete.isPending ||
    mutations.remove.isPending;

  async function save(input: CreateApplicationFollowUpTaskInput) {
    const parsed = (
      editing === "new" ? createApplicationFollowUpTaskInputSchema : updateApplicationFollowUpTaskInputSchema
    ).safeParse(input);
    if (!parsed.success) return;
    setStatus(null);
    try {
      if (editing === "new") await mutations.create.mutateAsync(parsed.data as CreateApplicationFollowUpTaskInput);
      else if (editing) await mutations.update.mutateAsync({ taskId: editing.id, input: parsed.data });
      setEditing(null);
      setStatus("saved");
    } catch {
      setStatus("saveFailed");
    }
  }

  async function complete(taskId: number) {
    setStatus(null);
    try {
      await mutations.complete.mutateAsync(taskId);
      setLocallyCompleted((ids) => [...ids, taskId]);
      setStatus("completed");
    } catch {
      setStatus("completeFailed");
    }
  }

  async function remove() {
    if (!deleting) return;
    setStatus(null);
    try {
      await mutations.remove.mutateAsync(deleting.id);
      setDeleting(null);
      setStatus("deleted");
    } catch {
      setDeleting(null);
      setStatus("deleteFailed");
    }
  }

  return { editing, setEditing, deleting, setDeleting, status, locallyCompleted, pending, save, complete, remove };
}
