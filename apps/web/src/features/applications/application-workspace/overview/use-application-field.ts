import { type UpdateApplicationInput, updateApplicationInputSchema } from "@xeniway/shared";
import { useEffect, useRef, useState } from "react";
import { getApiErrorKey } from "../../../../i18n/format";
import { ApiRequestError } from "../../../../lib/api";
import { useUpdateApplicationMutation } from "../../../../lib/queries";

export type EditableApplicationField =
  | "company"
  | "position"
  | "location"
  | "salary"
  | "jobUrl"
  | "description"
  | "notes"
  | "status"
  | "appliedAt";

export type ApplicationFieldController = {
  savedValue: string | null;
  draft: string;
  editing: boolean;
  pending: boolean;
  state: "error" | "invalid" | null;
  errorKey: string | null;
  setDraft(value: string): void;
  isDraftDirty(): boolean;
  beginEdit(): void;
  cancel(): void;
  save(value?: string): Promise<boolean>;
};

const nullableFields = new Set<EditableApplicationField>([
  "location",
  "salary",
  "jobUrl",
  "description",
  "notes",
  "appliedAt",
]);

export function useApplicationField(
  applicationId: number,
  field: EditableApplicationField,
  value: string | null,
): ApplicationFieldController {
  const mutation = useUpdateApplicationMutation();
  const [savedValue, setSavedValue] = useState(value);
  const [draft, setDraft] = useState(value ?? "");
  const [editing, setEditing] = useState(false);
  const [state, setState] = useState<"error" | "invalid" | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const savingRef = useRef(false);

  useEffect(() => {
    setSavedValue(value);
    if (!editing) {
      setDraft(value ?? "");
    }
  }, [editing, value]);

  function beginEdit() {
    setDraft(savedValue ?? "");
    setState(null);
    setErrorKey(null);
    setEditing(true);
  }

  function cancel() {
    setDraft(savedValue ?? "");
    setEditing(false);
    setState(null);
    setErrorKey(null);
  }

  function normalizeValue(valueToNormalize: string | null) {
    const trimmed = (valueToNormalize ?? "").trim();
    if (nullableFields.has(field)) {
      return trimmed || null;
    }
    return trimmed;
  }

  function isDraftDirty() {
    const normalizedDraft = updateApplicationInputSchema.safeParse({ [field]: normalizeValue(draft) });
    const normalizedSaved = updateApplicationInputSchema.safeParse({ [field]: normalizeValue(savedValue) });
    if (!normalizedDraft.success || !normalizedSaved.success) {
      return true;
    }
    return normalizedDraft.data[field] !== normalizedSaved.data[field];
  }

  async function save(valueToSave = draft) {
    if (savingRef.current) {
      return false;
    }
    const nextValue = normalizeValue(valueToSave);
    const parsed = updateApplicationInputSchema.safeParse({ [field]: nextValue });
    if (!parsed.success) {
      setState("invalid");
      setErrorKey(null);
      return false;
    }

    setState(null);
    setErrorKey(null);
    savingRef.current = true;
    try {
      const input = { [field]: parsed.data[field] } as UpdateApplicationInput;
      await mutation.mutateAsync({ id: applicationId, input });
      setSavedValue(nextValue);
      setDraft(nextValue ?? "");
      setEditing(false);
      setState(null);
      return true;
    } catch (error) {
      setState("error");
      setErrorKey(getApiErrorKey(error instanceof ApiRequestError ? error.code : "REQUEST_FAILED"));
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
    errorKey,
    setDraft,
    isDraftDirty,
    beginEdit,
    cancel,
    save,
  };
}
