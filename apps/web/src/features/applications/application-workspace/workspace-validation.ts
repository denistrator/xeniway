import {
  createApplicationContactInputSchema,
  createApplicationFollowUpTaskInputSchema,
} from "@xeniway/shared";

export type ContactDraft = {
  name: string;
  role: string;
  email: string;
  phone: string;
  profileUrl: string;
  notes: string;
};

export type ContactField = keyof ContactDraft;
export type ContactError =
  | "nameRequired"
  | "roleRequired"
  | "emailInvalid"
  | "phoneInvalid"
  | "profileInvalid"
  | "notesTooLong";
export type ContactErrors = Partial<Record<ContactField, ContactError>>;

export function validateContactDraft(draft: ContactDraft) {
  const result = createApplicationContactInputSchema.safeParse({
    ...draft,
    email: draft.email || null,
    phone: draft.phone || null,
    profileUrl: draft.profileUrl || null,
    notes: draft.notes || null,
  });
  if (result.success) return { input: result.data, errors: {} as ContactErrors, firstField: null };

  const errors: ContactErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as ContactField;
    const error = contactErrorForField(field);
    if (error) errors[field] = error;
  }
  return { input: null, errors, firstField: result.error.issues[0]?.path[0] as ContactField | undefined };
}

function contactErrorForField(field: ContactField): ContactError | undefined {
  const errors: Record<ContactField, ContactError> = {
    name: "nameRequired",
    role: "roleRequired",
    email: "emailInvalid",
    phone: "phoneInvalid",
    profileUrl: "profileInvalid",
    notes: "notesTooLong",
  };
  return errors[field];
}

export type FollowUpDraft = { title: string; dueDate: string; notes: string };
export type FollowUpError = "titleRequired" | "dateRequired" | "invalidDate";
export type FollowUpErrors = Partial<Record<"title" | "dueDate", FollowUpError>>;

export function validateFollowUpDraft(draft: FollowUpDraft) {
  const result = createApplicationFollowUpTaskInputSchema.safeParse({ ...draft, notes: draft.notes || null });
  if (result.success) return { input: result.data, errors: {} as FollowUpErrors, firstField: null };

  const errors: FollowUpErrors = {};
  for (const issue of result.error.issues) {
    if (issue.path[0] === "title") errors.title = "titleRequired";
    if (issue.path[0] === "dueDate") errors.dueDate = draft.dueDate ? "invalidDate" : "dateRequired";
  }
  return { input: null, errors, firstField: result.error.issues[0]?.path[0] as "title" | "dueDate" | undefined };
}
