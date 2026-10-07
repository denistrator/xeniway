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

export type ContactsController = {
  editor: {
    target: ApplicationContact | "new" | null;
    draft: ContactDraft;
    errors: ContactErrors;
    formRef: RefObject<HTMLFormElement | null>;
    firstFieldRef: RefObject<HTMLInputElement | null>;
    setField(field: ContactField, value: string): void;
    submit(event: FormEvent<HTMLFormElement>): Promise<void>;
    openNew(trigger: HTMLElement): void;
    openExisting(contact: ApplicationContact, trigger: HTMLElement): void;
    close(): void;
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

function validateDraft(draft: ContactDraft) {
  const result = createApplicationContactInputSchema.safeParse({
    ...draft,
    email: draft.email || null,
    phone: draft.phone || null,
    profileUrl: draft.profileUrl || null,
    notes: draft.notes || null,
  });
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
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
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
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  async function save(input: CreateApplicationContactInput) {
    const parsed = (
      editorTarget === "new" ? createApplicationContactInputSchema : updateApplicationContactInputSchema
    ).safeParse(input);
    if (!parsed.success) {
      return;
    }
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
    if (saved) {
      setEditorTarget(null);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateDraft(draft);
    if (!result.input) {
      setErrors(result.errors);
      const field = result.firstField ?? "name";
      formRef.current?.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${field}"]`)?.focus();
      return;
    }
    setErrors({});
    await save(result.input);
  }

  function openNew(trigger: HTMLElement) {
    rememberEditorFocus(trigger);
    setEditorTarget("new");
  }

  function openExisting(contact: ApplicationContact, trigger: HTMLElement) {
    rememberEditorFocus(trigger);
    setEditorTarget(contact);
  }

  function requestDeletion(contact: ApplicationContact, trigger: HTMLElement) {
    rememberDeletionFocus(trigger);
    setEditorTarget(null);
    setDeletionTarget(contact);
  }

  async function confirmDeletion() {
    if (!deletionTarget) {
      return;
    }
    await runWorkspaceMutation(
      () => mutations.remove.mutateAsync(deletionTarget.id),
      setStatus,
      "removed",
      "removeFailed",
    );
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
  };
}
