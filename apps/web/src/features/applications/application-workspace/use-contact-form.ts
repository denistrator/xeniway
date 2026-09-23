import type { ApplicationContact, CreateApplicationContactInput } from "@xeniway/shared";
import { type FormEvent, useRef, useState } from "react";
import { type ContactErrors, validateContactDraft } from "./workspace-validation";

type ContactDraft = Parameters<typeof validateContactDraft>[0];
const empty: ContactDraft = { name: "", role: "", email: "", phone: "", profileUrl: "", notes: "" };

export function useContactForm(
  contact: ApplicationContact | undefined,
  onSave: (input: CreateApplicationContactInput) => Promise<void>,
) {
  const [draft, setDraft] = useState<ContactDraft>(
    contact
      ? {
          name: contact.name,
          role: contact.role,
          email: contact.email ?? "",
          phone: contact.phone ?? "",
          profileUrl: contact.profileUrl ?? "",
          notes: contact.notes ?? "",
        }
      : empty,
  );
  const [errors, setErrors] = useState<ContactErrors>({});
  const formRef = useRef<HTMLFormElement>(null);
  const firstField = useRef<HTMLInputElement>(null);

  function setField(field: keyof ContactDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateContactDraft(draft);
    if (!result.input) {
      setErrors(result.errors);
      const field = result.firstField ?? "name";
      formRef.current?.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${field}"]`)?.focus();
      return;
    }
    setErrors({});
    await onSave(result.input);
  }

  return { draft, setField, errors, formRef, firstField, submit };
}
