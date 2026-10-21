import {
  type ApplicationFollowUpTask,
  type CreateApplicationFollowUpTaskInput,
  createApplicationFollowUpTaskInputSchema,
  updateApplicationFollowUpTaskInputSchema,
} from "@xeniway/shared";
import { type FormEvent, type RefObject, useEffect, useRef, useState } from "react";
import { useApplicationFollowUpMutations } from "../../../../lib/queries";
import { runWorkspaceMutation } from "../shared/run-workspace-mutation";
import { useReturnFocus } from "../shared/use-return-focus";

export type FollowUpDraft = { title: string; dueDate: string; notes: string };
type FollowUpError = "titleRequired" | "dateRequired" | "invalidDate";
export type FollowUpErrors = Partial<Record<"title" | "dueDate", FollowUpError>>;
export type FollowUpMutationStatus =
  | "saved"
  | "completed"
  | "deleted"
  | "saveFailed"
  | "completeFailed"
  | "deleteFailed"
  | null;
type FollowUpEditorTarget = ApplicationFollowUpTask | "new";
type PendingFollowUpEditor = { target: FollowUpEditorTarget; trigger: HTMLElement };

export type FollowUpsController = {
  editor: {
    target: ApplicationFollowUpTask | "new" | null;
    draft: FollowUpDraft;
    errors: FollowUpErrors;
    titleRef: RefObject<HTMLInputElement | null>;
    dateRef: RefObject<HTMLInputElement | null>;
    setTitle(value: string): void;
    setDueDate(value: string): void;
    setNotes(value: string): void;
    submit(event: FormEvent<HTMLFormElement>): Promise<void>;
    savePending(): Promise<void>;
    openNew(trigger: HTMLElement): void;
    openExisting(task: ApplicationFollowUpTask, trigger: HTMLElement): void;
    close(): void;
  };
  warning: {
    isOpen: boolean;
    returnFocusRef: RefObject<HTMLElement | null>;
    discard(): void;
    keepEditing(): void;
  };
  deletion: {
    target: ApplicationFollowUpTask | null;
    request(task: ApplicationFollowUpTask, trigger: HTMLElement): void;
    cancel(): void;
    confirm(): Promise<void>;
  };
  addButtonRef: RefObject<HTMLButtonElement | null>;
  pending: boolean;
  status: FollowUpMutationStatus;
  complete(taskId: number): Promise<void>;
};

export function validateFollowUpDraft(draft: FollowUpDraft) {
  const result = createApplicationFollowUpTaskInputSchema.safeParse({ ...draft, notes: draft.notes || null });
  if (result.success) {
    return { input: result.data, errors: {} as FollowUpErrors, firstField: null };
  }

  const errors: FollowUpErrors = {};
  for (const issue of result.error.issues) {
    if (issue.path[0] === "title") {
      errors.title = "titleRequired";
    }
    if (issue.path[0] === "dueDate") {
      errors.dueDate = draft.dueDate ? "invalidDate" : "dateRequired";
    }
  }
  return { input: null, errors, firstField: result.error.issues[0]?.path[0] as "title" | "dueDate" | undefined };
}

function isDirtyDraft(draft: FollowUpDraft, target: FollowUpEditorTarget) {
  const task = target === "new" ? undefined : target;
  return (
    draft.title !== (task?.title ?? "") ||
    draft.dueDate !== (task?.dueDate ?? "") ||
    draft.notes !== (task?.notes ?? "")
  );
}

export function useFollowUpsController(applicationId: number): FollowUpsController {
  const mutations = useApplicationFollowUpMutations(applicationId);
  const [editorTarget, setEditorTarget] = useState<ApplicationFollowUpTask | "new" | null>(null);
  const [deletionTarget, setDeletionTarget] = useState<ApplicationFollowUpTask | null>(null);
  const [draft, setDraft] = useState<FollowUpDraft>({ title: "", dueDate: "", notes: "" });
  const [errors, setErrors] = useState<FollowUpErrors>({});
  const [status, setStatus] = useState<FollowUpMutationStatus>(null);
  const [hasWarning, setHasWarning] = useState(false);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const pendingEditor = useRef<PendingFollowUpEditor | null>(null);
  const warningReturnFocusRef = useRef<HTMLElement | null>(null);
  const editedField = useRef<"title" | "dueDate" | "notes">("title");
  const savingRef = useRef(false);
  const rememberEditorFocus = useReturnFocus(editorTarget !== null, addButtonRef);
  const rememberDeletionFocus = useReturnFocus(deletionTarget !== null, addButtonRef);
  const pending =
    mutations.create.isPending ||
    mutations.update.isPending ||
    mutations.complete.isPending ||
    mutations.remove.isPending;

  useEffect(() => {
    if (!editorTarget) {
      return;
    }
    const task = editorTarget === "new" ? undefined : editorTarget;
    setDraft({ title: task?.title ?? "", dueDate: task?.dueDate ?? "", notes: task?.notes ?? "" });
    setErrors({});
    titleRef.current?.focus();
  }, [editorTarget]);

  function setTitle(value: string) {
    editedField.current = "title";
    setDraft((current) => ({ ...current, title: value }));
    setErrors((current) => ({ ...current, title: undefined }));
  }

  function setDueDate(value: string) {
    editedField.current = "dueDate";
    setDraft((current) => ({ ...current, dueDate: value }));
    setErrors((current) => ({ ...current, dueDate: undefined }));
  }

  function activateEditor(target: FollowUpEditorTarget, trigger: HTMLElement) {
    rememberEditorFocus(trigger);
    setEditorTarget(target);
  }

  function finishEditor() {
    const nextEditor = pendingEditor.current;
    pendingEditor.current = null;
    setHasWarning(false);
    if (nextEditor) {
      activateEditor(nextEditor.target, nextEditor.trigger);
      return;
    }
    setEditorTarget(null);
  }

  async function save(input: CreateApplicationFollowUpTaskInput) {
    if (savingRef.current) {
      return false;
    }
    const parsed = (
      editorTarget === "new" ? createApplicationFollowUpTaskInputSchema : updateApplicationFollowUpTaskInputSchema
    ).safeParse(input);
    if (!parsed.success) {
      return false;
    }
    savingRef.current = true;
    const saved = await runWorkspaceMutation(
      async () => {
        if (editorTarget === "new") {
          await mutations.create.mutateAsync(parsed.data as CreateApplicationFollowUpTaskInput);
        } else if (editorTarget) {
          await mutations.update.mutateAsync({ taskId: editorTarget.id, input: parsed.data });
        }
      },
      setStatus,
      "saved",
      "saveFailed",
    );
    savingRef.current = false;
    if (saved) {
      finishEditor();
    }
    return saved;
  }

  async function submitDraft() {
    const result = validateFollowUpDraft(draft);
    if (!result.input) {
      setErrors(result.errors);
      switch (result.firstField) {
        case "title":
          titleRef.current?.focus();
          break;
        case "dueDate":
          dateRef.current?.focus();
          break;
      }
      return false;
    }
    setErrors({});
    return save(result.input);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitDraft();
  }

  function openNew(trigger: HTMLElement) {
    requestEditor("new", trigger);
  }

  function openExisting(task: ApplicationFollowUpTask, trigger: HTMLElement) {
    requestEditor(task, trigger);
  }

  function requestEditor(target: FollowUpEditorTarget, trigger: HTMLElement) {
    if (!editorTarget || !isDirtyDraft(draft, editorTarget)) {
      activateEditor(target, trigger);
      return;
    }
    pendingEditor.current = { target, trigger };
    const field = editedField.current;
    warningReturnFocusRef.current = document.querySelector<HTMLElement>(`[name="${field}"]`);
    setHasWarning(true);
  }

  function requestDeletion(task: ApplicationFollowUpTask, trigger: HTMLElement) {
    rememberDeletionFocus(trigger);
    setDeletionTarget(task);
  }

  async function complete(taskId: number) {
    await runWorkspaceMutation(() => mutations.complete.mutateAsync(taskId), setStatus, "completed", "completeFailed");
  }

  async function confirmDeletion() {
    if (!deletionTarget) {
      return;
    }
    const deleted = await runWorkspaceMutation(
      () => mutations.remove.mutateAsync(deletionTarget.id),
      setStatus,
      "deleted",
      "deleteFailed",
    );
    if (deleted && editorTarget && editorTarget !== "new" && editorTarget.id === deletionTarget.id) {
      setEditorTarget(null);
    }
    setDeletionTarget(null);
  }

  return {
    editor: {
      target: editorTarget,
      draft,
      errors,
      titleRef,
      dateRef,
      setTitle,
      setDueDate,
      setNotes(notes) {
        editedField.current = "notes";
        setDraft((current) => ({ ...current, notes }));
      },
      submit,
      async savePending() {
        await submitDraft();
      },
      openNew,
      openExisting,
      close: () => setEditorTarget(null),
    },
    warning: {
      isOpen: hasWarning,
      returnFocusRef: warningReturnFocusRef,
      discard: finishEditor,
      keepEditing: () => {
        pendingEditor.current = null;
        setHasWarning(false);
      },
    },
    deletion: {
      target: deletionTarget,
      request: requestDeletion,
      cancel: () => setDeletionTarget(null),
      confirm: confirmDeletion,
    },
    addButtonRef,
    pending,
    status,
    complete,
  };
}
