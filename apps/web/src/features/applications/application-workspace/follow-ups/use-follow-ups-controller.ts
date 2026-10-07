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
    openNew(trigger: HTMLElement): void;
    openExisting(task: ApplicationFollowUpTask, trigger: HTMLElement): void;
    close(): void;
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

export function useFollowUpsController(applicationId: number): FollowUpsController {
  const mutations = useApplicationFollowUpMutations(applicationId);
  const [editorTarget, setEditorTarget] = useState<ApplicationFollowUpTask | "new" | null>(null);
  const [deletionTarget, setDeletionTarget] = useState<ApplicationFollowUpTask | null>(null);
  const [draft, setDraft] = useState<FollowUpDraft>({ title: "", dueDate: "", notes: "" });
  const [errors, setErrors] = useState<FollowUpErrors>({});
  const [status, setStatus] = useState<FollowUpMutationStatus>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
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
    setDraft((current) => ({ ...current, title: value }));
    setErrors((current) => ({ ...current, title: undefined }));
  }

  function setDueDate(value: string) {
    setDraft((current) => ({ ...current, dueDate: value }));
    setErrors((current) => ({ ...current, dueDate: undefined }));
  }

  async function save(input: CreateApplicationFollowUpTaskInput) {
    const parsed = (
      editorTarget === "new" ? createApplicationFollowUpTaskInputSchema : updateApplicationFollowUpTaskInputSchema
    ).safeParse(input);
    if (!parsed.success) {
      return;
    }
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
    if (saved) {
      setEditorTarget(null);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      return;
    }
    setErrors({});
    await save(result.input);
  }

  function openNew(trigger: HTMLElement) {
    rememberEditorFocus(trigger);
    setEditorTarget("new");
  }

  function openExisting(task: ApplicationFollowUpTask, trigger: HTMLElement) {
    rememberEditorFocus(trigger);
    setEditorTarget(task);
  }

  function requestDeletion(task: ApplicationFollowUpTask, trigger: HTMLElement) {
    rememberDeletionFocus(trigger);
    setEditorTarget(null);
    setDeletionTarget(task);
  }

  async function complete(taskId: number) {
    await runWorkspaceMutation(() => mutations.complete.mutateAsync(taskId), setStatus, "completed", "completeFailed");
  }

  async function confirmDeletion() {
    if (!deletionTarget) {
      return;
    }
    await runWorkspaceMutation(
      () => mutations.remove.mutateAsync(deletionTarget.id),
      setStatus,
      "deleted",
      "deleteFailed",
    );
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
      setNotes: (notes) => setDraft((current) => ({ ...current, notes })),
      submit,
      openNew,
      openExisting,
      close: () => setEditorTarget(null),
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
