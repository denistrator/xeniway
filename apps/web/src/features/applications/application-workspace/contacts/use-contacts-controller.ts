import {
  type ApplicationContact,
  type CreateApplicationContactInput,
  createApplicationContactInputSchema,
  updateApplicationContactInputSchema,
} from "@xeniway/shared";
import { type FormEvent, type RefObject, useEffect, useRef, useState } from "react";
import { useApplicationContactMutations } from "../../../../lib/queries";
import { runWorkspaceMutation } from "../shared/run-workspace-mutation";
import { useReturnFocus } from "../shared/use-return-focus";

export type ContactDraft = {
  name: string;
  role: string;
  email: string;
  phone: string;
  profileUrl: string;
  notes: string;
};
export type ContactField = keyof ContactDraft;
type ContactError =
  | "nameRequired"
  | "roleRequired"
  | "emailInvalid"
  | "phoneInvalid"
  | "profileInvalid"
  | "notesTooLong";
export type ContactErrors = Partial<Record<ContactField, ContactError>>;
export type ContactMutationStatus = "saved" | "removed" | "saveFailed" | "removeFailed" | null;
type ContactEditorTarget = ApplicationContact | "new";
type PendingContactEditor = { target: ContactEditorTarget; trigger: HTMLElement };

export type ContactsController = {
  editor: {
    target: ApplicationContact | "new" | null;
    draft: ContactDraft;
    errors: ContactErrors;
    formRef: RefObject<HTMLFormElement | null>;
    firstFieldRef: RefObject<HTMLInputElement | null>;
    setField(field: ContactField, value: string): void;
    submit(event: FormEvent<HTMLFormElement>): Promise<void>;
    savePending(): Promise<void>;
    openNew(trigger: HTMLElement): void;
    openExisting(contact: ApplicationContact, trigger: HTMLElement): void;
    close(): void;
  };
  warning: {
    isOpen: boolean;
    returnFocusRef: RefObject<HTMLElement | null>;
    discard(): void;
    keepEditing(): void;
  };
  deletion: {
    target: ApplicationContact | null;
    request(contact: ApplicationContact, trigger: HTMLElement): void;
    cancel(): void;
    confirm(): Promise<void>;
  };
  addButtonRef: RefObject<HTMLButtonElement | null>;
  pending: boolean;
  status: ContactMutationStatus;
};

const emptyDraft: ContactDraft = { name: "", role: "", email: "", phone: "", profileUrl: "", notes: "" };
const errorByField: Record<ContactField, ContactError> = {
  name: "nameRequired",
  role: "roleRequired",
  email: "emailInvalid",
  phone: "phoneInvalid",
  profileUrl: "profileInvalid",
  notes: "notesTooLong",
};

function createDraft(contact?: ApplicationContact): ContactDraft {
  return contact
    ? {
        name: contact.name,
        role: contact.role,
        email: contact.email ?? "",
        phone: contact.phone ?? "",
        profileUrl: contact.profileUrl ?? "",
        notes: contact.notes ?? "",
      }
    : { ...emptyDraft };
}

function toContactInput(draft: ContactDraft) {
  return {
    ...draft,
    email: toOptionalValue(draft.email),
    phone: toOptionalValue(draft.phone),
    profileUrl: toOptionalValue(draft.profileUrl),
    notes: toOptionalValue(draft.notes),
  };
}

function toOptionalValue(value: string) {
  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeDraft(draft: ContactDraft) {
  const result = createApplicationContactInputSchema.safeParse(toContactInput(draft));
  if (!result.success) {
    return null;
  }
  return result.data;
}

function isDirtyDraft(draft: ContactDraft, target: ContactEditorTarget) {
  const normalizedDraft = normalizeDraft(draft);
  const normalizedInitial = normalizeDraft(createDraft(target === "new" ? undefined : target));
  if (!normalizedDraft || !normalizedInitial) {
    return true;
  }
  return (
    normalizedDraft.name !== normalizedInitial.name ||
    normalizedDraft.role !== normalizedInitial.role ||
    normalizedDraft.email !== normalizedInitial.email ||
    normalizedDraft.phone !== normalizedInitial.phone ||
    normalizedDraft.profileUrl !== normalizedInitial.profileUrl ||
    normalizedDraft.notes !== normalizedInitial.notes
  );
}

function validateDraft(draft: ContactDraft) {
  const result = createApplicationContactInputSchema.safeParse(toContactInput(draft));
  if (result.success) {
    return { input: result.data, errors: {} as ContactErrors, firstField: null };
  }

  const errors: ContactErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as ContactField;
    errors[field] = errorByField[field];
  }
  return { input: null, errors, firstField: result.error.issues[0]?.path[0] as ContactField | undefined };
}

export function useContactsController(applicationId: number): ContactsController {
  const mutations = useApplicationContactMutations(applicationId);
  const [editorTarget, setEditorTarget] = useState<ApplicationContact | "new" | null>(null);
  const [deletionTarget, setDeletionTarget] = useState<ApplicationContact | null>(null);
  const [draft, setDraft] = useState<ContactDraft>(emptyDraft);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [status, setStatus] = useState<ContactMutationStatus>(null);
  const [hasWarning, setHasWarning] = useState(false);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const pendingEditor = useRef<PendingContactEditor | null>(null);
  const warningReturnFocusRef = useRef<HTMLElement | null>(null);
  const editedField = useRef<ContactField>("name");
  const savingRef = useRef(false);
  const rememberEditorFocus = useReturnFocus(editorTarget !== null, addButtonRef);
  const rememberDeletionFocus = useReturnFocus(deletionTarget !== null, addButtonRef);
  const pending = mutations.create.isPending || mutations.update.isPending || mutations.remove.isPending;

  useEffect(() => {
    if (!editorTarget) {
      return;
    }
    setDraft(createDraft(editorTarget === "new" ? undefined : editorTarget));
    setErrors({});
    firstFieldRef.current?.focus();
  }, [editorTarget]);

  function setField(field: ContactField, value: string) {
    editedField.current = field;
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function activateEditor(target: ContactEditorTarget, trigger: HTMLElement) {
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

  async function save(input: CreateApplicationContactInput) {
    if (savingRef.current) {
      return false;
    }
    const parsed = (
      editorTarget === "new" ? createApplicationContactInputSchema : updateApplicationContactInputSchema
    ).safeParse(input);
    if (!parsed.success) {
      return false;
    }
    savingRef.current = true;
    const saved = await runWorkspaceMutation(
      async () => {
        if (editorTarget === "new") {
          await mutations.create.mutateAsync(parsed.data as CreateApplicationContactInput);
        } else if (editorTarget) {
          await mutations.update.mutateAsync({ contactId: editorTarget.id, input: parsed.data });
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
    const result = validateDraft(draft);
    if (!result.input) {
      setErrors(result.errors);
      const field = result.firstField ?? "name";
      formRef.current?.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${field}"]`)?.focus();
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

  function openExisting(contact: ApplicationContact, trigger: HTMLElement) {
    requestEditor(contact, trigger);
  }

  function requestEditor(target: ContactEditorTarget, trigger: HTMLElement) {
    if (!editorTarget || !isDirtyDraft(draft, editorTarget)) {
      activateEditor(target, trigger);
      return;
    }
    pendingEditor.current = { target, trigger };
    warningReturnFocusRef.current = formRef.current?.elements.namedItem(editedField.current) as HTMLElement | null;
    setHasWarning(true);
  }

  function requestDeletion(contact: ApplicationContact, trigger: HTMLElement) {
    rememberDeletionFocus(trigger);
    setDeletionTarget(contact);
  }

  async function confirmDeletion() {
    if (!deletionTarget) {
      return;
    }
    const removed = await runWorkspaceMutation(
      () => mutations.remove.mutateAsync(deletionTarget.id),
      setStatus,
      "removed",
      "removeFailed",
    );
    if (removed && editorTarget && editorTarget !== "new" && editorTarget.id === deletionTarget.id) {
      setEditorTarget(null);
    }
    setDeletionTarget(null);
  }

  return {
    editor: {
      target: editorTarget,
      draft,
      errors,
      formRef,
      firstFieldRef,
      setField,
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
  };
}
