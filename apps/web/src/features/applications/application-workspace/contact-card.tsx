import type { ApplicationContact } from "@xeniway/shared";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/ui/button";
import { safeProfileUrl } from "./contact-links";

export function ContactCard({
  contact,
  onEdit,
  onRemove,
}: {
  contact: ApplicationContact;
  onEdit: (trigger: HTMLButtonElement) => void;
  onRemove: (trigger: HTMLButtonElement) => void;
}) {
  const { t } = useTranslation();
  const profileUrl = safeProfileUrl(contact.profileUrl);
  return (
    <li className="rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg text-ink">{contact.name}</h3>
          <p className="text-sm text-muted">{contact.role}</p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-label={t("applications.workspace.contacts.editNamed", { name: contact.name })}
            onClick={(event) => onEdit(event.currentTarget)}
          >
            {t("applications.workspace.actions.edit")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            aria-label={t("applications.workspace.contacts.removeNamed", { name: contact.name })}
            onClick={(event) => onRemove(event.currentTarget)}
          >
            {t("applications.workspace.actions.remove")}
          </Button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-accent">
        {contact.email && (
          <a
            className="break-all underline underline-offset-2 focus-visible:outline-2"
            href={`mailto:${contact.email}`}
          >
            {contact.email}
          </a>
        )}
        {contact.phone && (
          <a
            className="underline underline-offset-2 focus-visible:outline-2"
            href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`}
          >
            {contact.phone}
          </a>
        )}
        {profileUrl && (
          <a
            className="underline underline-offset-2 focus-visible:outline-2"
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("applications.workspace.contacts.profileNamed", { name: contact.name })}
          >
            {t("applications.workspace.contacts.profile")}
          </a>
        )}
      </div>
      {contact.notes && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted">{contact.notes}</p>}
    </li>
  );
}
