import { type ApplicationPreparation, updateApplicationPreparationInputSchema } from "@xeniway/shared";
import { useEffect, useState } from "react";
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
  save(value?: string): Promise<void>;
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
    const parsed = updateApplicationPreparationInputSchema.safeParse({ [field]: valueToSave.trim() || null });
    if (!parsed.success) {
      setState("invalid");
      return;
    }
    setState(null);
    try {
      await mutation.mutateAsync(parsed.data);
      setSavedValue(parsed.data[field] ?? null);
      setEditing(false);
      setState(null);
    } catch {
      setState("error");
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
