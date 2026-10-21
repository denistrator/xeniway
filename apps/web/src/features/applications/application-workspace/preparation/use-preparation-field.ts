import { type ApplicationPreparation, updateApplicationPreparationInputSchema } from "@xeniway/shared";
import { useEffect, useRef, useState } from "react";
import { useApplicationPreparationMutation } from "../../../../lib/queries";

export type PreparationField = keyof Pick<
  ApplicationPreparation,
  "companyResearch" | "talkingPoints" | "interviewerQuestions"
>;

export type PreparationFieldController = {
  savedValue: string | null;
  draft: string;
  editing: boolean;
  pending: boolean;
  state: "error" | "invalid" | null;
  setDraft(value: string): void;
  beginEdit(): void;
  cancel(): void;
  save(value?: string): Promise<boolean>;
};

export function usePreparationField(
  applicationId: number,
  field: PreparationField,
  value: string | null,
): PreparationFieldController {
  const mutation = useApplicationPreparationMutation(applicationId);
  const [savedValue, setSavedValue] = useState(value);
  const [draft, setDraft] = useState(value ?? "");
  const [editing, setEditing] = useState(false);
  const [state, setState] = useState<"error" | "invalid" | null>(null);
  const savingRef = useRef(false);

  useEffect(() => setSavedValue(value), [value]);

  function beginEdit() {
    setDraft(savedValue ?? "");
    setState(null);
    setEditing(true);
  }

  function cancel() {
    setDraft(savedValue ?? "");
    setEditing(false);
    setState(null);
  }

  async function save(valueToSave = draft) {
    if (savingRef.current) {
      return false;
    }
    const parsed = updateApplicationPreparationInputSchema.safeParse({ [field]: valueToSave.trim() || null });
    if (!parsed.success) {
      setState("invalid");
      return false;
    }
    setState(null);
    savingRef.current = true;
    try {
      await mutation.mutateAsync(parsed.data);
      setSavedValue(parsed.data[field] ?? null);
      setEditing(false);
      setState(null);
      return true;
    } catch {
      setState("error");
      return false;
    } finally {
      savingRef.current = false;
    }
  }

  return {
    savedValue,
    draft,
    editing,
    pending: mutation.isPending,
    state,
    setDraft,
    beginEdit,
    cancel,
    save,
  };
}
