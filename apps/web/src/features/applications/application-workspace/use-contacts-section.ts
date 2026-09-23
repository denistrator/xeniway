import {
  type ApplicationContact,
  type CreateApplicationContactInput,
  createApplicationContactInputSchema,
  updateApplicationContactInputSchema,
} from "@xeniway/shared";
import { useState } from "react";
import { useApplicationContactMutations } from "../../../lib/queries";
import { runWorkspaceMutation } from "./run-workspace-mutation";

export function useContactsSection(applicationId: number) {
  const mutations = useApplicationContactMutations(applicationId);
  const [editing, setEditing] = useState<ApplicationContact | "new" | null>(null);
  const [deleting, setDeleting] = useState<ApplicationContact | null>(null);
  const [status, setStatus] = useState<"saved" | "removed" | "saveFailed" | "removeFailed" | null>(null);
  const pending = mutations.create.isPending || mutations.update.isPending || mutations.remove.isPending;

  async function save(input: CreateApplicationContactInput) {
    const parsed = (
      editing === "new" ? createApplicationContactInputSchema : updateApplicationContactInputSchema
    ).safeParse(input);
    if (!parsed.success) return;
    const saved = await runWorkspaceMutation(
      async () => {
        if (editing === "new") await mutations.create.mutateAsync(parsed.data as CreateApplicationContactInput);
        else if (editing) await mutations.update.mutateAsync({ contactId: editing.id, input: parsed.data });
      },
      setStatus,
      "saved",
      "saveFailed",
    );
    if (saved) setEditing(null);
  }

  async function remove() {
    if (!deleting) return;
    await runWorkspaceMutation(() => mutations.remove.mutateAsync(deleting.id), setStatus, "removed", "removeFailed");
    setDeleting(null);
  }

  return { editing, setEditing, deleting, setDeleting, status, pending, save, remove };
}
