import type { ApplicationContact } from "@xeniway/shared";
import { useId, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "../../../../components/ui/card";
import { useReturnFocus } from "../shared/use-return-focus";
import { WorkspaceDeleteConfirmation } from "../shared/workspace-delete-confirmation";
import { WorkspaceSectionHeader } from "../shared/workspace-section-header";
import { WorkspaceStatus } from "../shared/workspace-status";
import { ContactForm } from "./contact-form";
import { ContactList } from "./contact-list";
import { useContactsSection } from "./use-contacts-section";

export function ContactsSection({
  applicationId,
  contacts,
}: {
  applicationId: number;
  contacts: ApplicationContact[];
}) {
  const { t } = useTranslation();
  const headingId = useId();
  const section = useContactsSection(applicationId);
  const addButton = useRef<HTMLButtonElement>(null);
  const rememberEditorFocus = useReturnFocus(Boolean(section.editing), addButton);
  const rememberConfirmationFocus = useReturnFocus(Boolean(section.deleting), addButton);
  return (
    <section aria-labelledby={headingId}>
      <Card>
        <WorkspaceSectionHeader
          headingId={headingId}
          title={t("applications.workspace.contacts.heading")}
          help={t("applications.workspace.contacts.help")}
          addLabel={t("applications.workspace.contacts.add")}
          addButton={addButton}
          disabled={Boolean(section.editing)}
          onAdd={(trigger) => {
            rememberEditorFocus(trigger);
            section.setEditing("new");
          }}
        />
        <CardContent>
          {section.editing && (
            <ContactForm
              key={section.editing === "new" ? "new" : section.editing.id}
              contact={section.editing === "new" ? undefined : section.editing}
              onSave={section.save}
              onCancel={() => section.setEditing(null)}
              pending={section.pending}
            />
          )}
          <ContactList
            contacts={contacts}
            onEdit={(contact, trigger) => {
              rememberEditorFocus(trigger);
              section.setEditing(contact);
            }}
            onRemove={(contact, trigger) => {
              rememberConfirmationFocus(trigger);
              section.setEditing(null);
              section.setDeleting(contact);
            }}
          />
          <WorkspaceStatus section="contacts" pending={section.pending} status={section.status} />
        </CardContent>
      </Card>
      {section.deleting && (
        <WorkspaceDeleteConfirmation
          title={t("applications.workspace.contacts.removeTitle")}
          text={t("applications.workspace.contacts.removeConfirmation", { name: section.deleting.name })}
          yesLabel={t("common.actions.yes")}
          noLabel={t("common.actions.no")}
          onYes={() => void section.remove()}
          onNo={() => section.setDeleting(null)}
          pending={section.pending}
        />
      )}
    </section>
  );
}
