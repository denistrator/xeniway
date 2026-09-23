import { type ApplicationPreparation, updateApplicationPreparationInputSchema } from "@xeniway/shared";
import { useEffect, useState } from "react";
import { useApplicationPreparationMutation } from "../../../../lib/queries";

export type PreparationKey = keyof Pick<
  ApplicationPreparation,
  "companyResearch" | "talkingPoints" | "interviewerQuestions"
>;

export function usePreparationField(applicationId: number, field: PreparationKey, value: string | null) {
  const mutation = useApplicationPreparationMutation(applicationId);
  const [savedValue, setSavedValue] = useState(value);
  const [draft, setDraft] = useState(value ?? "");
  const [editing, setEditing] = useState(false);
  const [state, setState] = useState<"saved" | "error" | "invalid" | null>(null);

  useEffect(() => {
    setSavedValue(value);
  }, [value]);

  function cancel() {
    setDraft(savedValue ?? "");
    setEditing(false);
    setState(null);
  }

  async function save() {
    const parsed = updateApplicationPreparationInputSchema.safeParse({ [field]: draft.trim() || null });
    if (!parsed.success) {
      setState("invalid");
      return;
    }
    setState(null);
    try {
      await mutation.mutateAsync(parsed.data);
      setSavedValue(parsed.data[field] ?? null);
      setEditing(false);
      setState("saved");
    } catch {
      setState("error");
    }
  }

  function beginEdit() {
    setDraft(savedValue ?? "");
    setState(null);
    setEditing(true);
  }

  return { savedValue, draft, setDraft, editing, beginEdit, state, cancel, save, pending: mutation.isPending };
}
