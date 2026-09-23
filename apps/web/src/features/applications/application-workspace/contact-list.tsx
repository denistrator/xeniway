import type { ApplicationContact } from "@xeniway/shared";
import { useTranslation } from "react-i18next";
import { ContactCard } from "./contact-card";

export function ContactList({
  contacts,
  onEdit,
  onRemove,
}: {
  contacts: ApplicationContact[];
  onEdit: (contact: ApplicationContact, trigger: HTMLButtonElement) => void;
  onRemove: (contact: ApplicationContact, trigger: HTMLButtonElement) => void;
}) {
  const { t } = useTranslation();
  if (contacts.length === 0)
    return (
      <p className="rounded-xl border border-dashed border-line p-5 text-sm text-muted">
        {t("applications.workspace.contacts.empty")}
      </p>
    );
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {contacts.map((contact) => (
        <ContactCard
          key={contact.id}
          contact={contact}
          onEdit={(trigger) => onEdit(contact, trigger)}
          onRemove={(trigger) => onRemove(contact, trigger)}
        />
      ))}
    </ul>
  );
}
