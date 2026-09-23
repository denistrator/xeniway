import type { ApplicationContact, CreateApplicationContactInput } from "@xeniway/shared";
import { useEffect, useId } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../../components/ui/button";
import { ContactFormFields } from "./contact-form-fields";
import { useContactForm } from "./use-contact-form";

export function ContactForm({
  contact,
  onSave,
  onCancel,
  pending,
}: {
  contact?: ApplicationContact;
  onSave: (input: CreateApplicationContactInput) => Promise<void>;
  onCancel: () => void;
  pending: boolean;
}) {
  const { t } = useTranslation();
  const id = useId();
  const form = useContactForm(contact, onSave);
  useEffect(() => {
    form.firstField.current?.focus();
  }, [form.firstField]);
  return (
    <form
      ref={form.formRef}
      noValidate
      onSubmit={(event) => {
        void form.submit(event);
      }}
      className="mt-4 space-y-4 rounded-xl border border-line bg-surface-tint p-4"
    >
      <h3 className="font-display text-lg text-ink">
        {t(contact ? "applications.workspace.contacts.edit" : "applications.workspace.contacts.add")}
      </h3>
      <ContactFormFields id={id} form={form} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {t(pending ? "applications.workspace.actions.saving" : "applications.workspace.contacts.save")}
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={onCancel}>
          {t("applications.workspace.actions.cancel")}
        </Button>
      </div>
    </form>
  );
}
