import {
  type ApplicationContact,
  type CreateApplicationContactInput,
  createApplicationContactInputSchema,
} from "@xeniway/shared";
import { type FormEvent, useEffect, useRef, useState } from "react";

type ContactDraft = { name: string; role: string; email: string; phone: string; profileUrl: string; notes: string };
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
  const [error, setError] = useState<"required" | "email" | "profile" | "invalid" | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const firstField = useRef<HTMLInputElement>(null);
  useEffect(() => {
    firstField.current?.focus();
  }, []);

  function setField(field: keyof ContactDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = createApplicationContactInputSchema.safeParse({
      name: draft.name,
      role: draft.role,
      email: draft.email || null,
      phone: draft.phone || null,
      profileUrl: draft.profileUrl || null,
      notes: draft.notes || null,
    });
    if (!parsed.success) {
      const field = String(parsed.error.issues[0]?.path[0] ?? "name");
      setError(
        field === "name" || field === "role"
          ? "required"
          : field === "email"
            ? "email"
            : field === "profileUrl"
              ? "profile"
              : "invalid",
      );
      formRef.current?.querySelector<HTMLInputElement>(`[name="${field}"]`)?.focus();
      return;
    }
    setError(null);
    await onSave(parsed.data);
  }

  return { draft, setField, error, formRef, firstField, submit };
}
