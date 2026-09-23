import type { ApplicationContact } from "@xeniway/shared";
import { useId, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { ConfirmationModal } from "../../../components/ui/confirmation-modal";
import { ContactForm } from "./contact-form";
import { ContactList } from "./contact-list";
import { useContactsSection } from "./use-contacts-section";
import { useReturnFocus } from "./use-return-focus";
import { WorkspaceStatus } from "./workspace-status";

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
        <CardHeader className="flex flex-wrap flex-row items-start justify-between gap-3">
          <div>
            <CardTitle id={headingId} className="font-display text-xl">
              {t("applications.workspace.contacts.heading")}
            </CardTitle>
            <p className="mt-1 text-sm text-muted">{t("applications.workspace.contacts.help")}</p>
          </div>
          <Button
            ref={addButton}
            type="button"
            size="sm"
            disabled={Boolean(section.editing)}
            onClick={(event) => {
              rememberEditorFocus(event.currentTarget);
              section.setEditing("new");
            }}
          >
            {t("applications.workspace.contacts.add")}
          </Button>
        </CardHeader>
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
        <ConfirmationModal
          title={t("applications.workspace.contacts.removeTitle")}
          text={t("applications.workspace.contacts.removeConfirmation", { name: section.deleting.name })}
          yesLabel={t("common.actions.yes")}
          noLabel={t("common.actions.no")}
          onYes={() => {
            void section.remove();
          }}
          onNo={() => section.setDeleting(null)}
          yesDisabled={section.pending}
        />
      )}
    </section>
  );
}
