import {
  type ApplicationFollowUpTask,
  type CreateApplicationFollowUpTaskInput,
  createApplicationFollowUpTaskInputSchema,
  updateApplicationFollowUpTaskInputSchema,
} from "@xeniway/shared";
import { useState } from "react";
import { useApplicationFollowUpMutations } from "../../../../lib/queries";
import { runWorkspaceMutation } from "../shared/run-workspace-mutation";

export function useFollowUpsSection(applicationId: number) {
  const mutations = useApplicationFollowUpMutations(applicationId);
  const [editing, setEditing] = useState<ApplicationFollowUpTask | "new" | null>(null);
  const [deleting, setDeleting] = useState<ApplicationFollowUpTask | null>(null);
  const [status, setStatus] = useState<
    "saved" | "completed" | "deleted" | "saveFailed" | "completeFailed" | "deleteFailed" | null
  >(null);
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
    const saved = await runWorkspaceMutation(
      async () => {
        if (editing === "new") await mutations.create.mutateAsync(parsed.data as CreateApplicationFollowUpTaskInput);
        else if (editing) await mutations.update.mutateAsync({ taskId: editing.id, input: parsed.data });
      },
      setStatus,
      "saved",
      "saveFailed",
    );
    if (saved) setEditing(null);
  }

  async function complete(taskId: number) {
    await runWorkspaceMutation(() => mutations.complete.mutateAsync(taskId), setStatus, "completed", "completeFailed");
  }

  async function remove() {
    if (!deleting) return;
    await runWorkspaceMutation(() => mutations.remove.mutateAsync(deleting.id), setStatus, "deleted", "deleteFailed");
    setDeleting(null);
  }

  return { editing, setEditing, deleting, setDeleting, status, pending, save, complete, remove };
}
