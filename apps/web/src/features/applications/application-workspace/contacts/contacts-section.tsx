import type { ApplicationContact } from "@xeniway/shared";
import { memo, useId } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent } from "../../../../components/ui/card";
import { ConfirmationModal } from "../../../../components/ui/confirmation-modal";
import { emptyStateStyles } from "../../../../components/ui/surface-styles";
import { useCanMutate } from "../../../offline/offline-access";
import { sanitizeExternalUrl } from "../shared/sanitize-external-url";
import { WorkspaceMutationStatus, WorkspaceSectionHeader } from "../shared/workspace-section-ui";
import { ContactForm } from "./contact-form";
import { useContactsController } from "./use-contacts-controller";

export const ContactsSection = memo(function ContactsSection({
  applicationId,
  contacts,
}: {
  applicationId: number;
  contacts: ApplicationContact[];
}) {
  const { t } = useTranslation();
  const canMutate = useCanMutate();
  const headingId = useId();
  const controller = useContactsController(applicationId);
  const isEditorOpen = controller.editor.target !== null;
  const statusIsError = controller.status?.endsWith("Failed") ?? false;

  return (
    <section tabIndex={-1} aria-labelledby={headingId} className="focus-visible:outline-2">
      <Card>
        <WorkspaceSectionHeader
          headingId={headingId}
          title={t("applications.workspace.contacts.heading")}
          actionLabel={t("applications.workspace.contacts.add")}
          actionRef={controller.addButtonRef}
          actionDisabled={!canMutate || isEditorOpen}
          onAction={controller.editor.openNew}
        />
        <CardContent>
          <ContactForm controller={controller} />
          {contacts.length === 0 ? (
            <p className={emptyStateStyles()}>{t("applications.workspace.contacts.empty")}</p>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {contacts.map((contact) => {
                const safeProfileUrl = sanitizeExternalUrl(contact.profileUrl);
                return (
                  <li key={contact.id} className="rounded-xl border border-line bg-surface p-4">
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
                          disabled={!canMutate}
                          onClick={(event) => controller.editor.openExisting(contact, event.currentTarget)}
                        >
                          {t("applications.workspace.actions.edit")}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          aria-label={t("applications.workspace.contacts.removeNamed", { name: contact.name })}
                          disabled={!canMutate}
                          onClick={(event) => controller.deletion.request(contact, event.currentTarget)}
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
                      {safeProfileUrl && (
                        <a
                          className="underline underline-offset-2 focus-visible:outline-2"
                          href={safeProfileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={t("applications.workspace.contacts.profileNamed", { name: contact.name })}
                        >
                          {t("applications.workspace.contacts.profile")}
                        </a>
                      )}
                    </div>
                    {contact.notes && (
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted">{contact.notes}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <WorkspaceMutationStatus
            pending={controller.pending}
            pendingText={t("applications.workspace.actions.saving")}
            text={controller.status ? t(`applications.workspace.contacts.${controller.status}`) : null}
            isError={statusIsError}
          />
        </CardContent>
      </Card>
      {controller.deletion.target && (
        <ConfirmationModal
          title={t("applications.workspace.contacts.removeTitle")}
          text={t("applications.workspace.contacts.removeConfirmation", { name: controller.deletion.target.name })}
          yesLabel={t("common.actions.yes")}
          noLabel={t("common.actions.no")}
          onYes={() => {
            if (canMutate) {
              void controller.deletion.confirm();
            }
          }}
          onNo={controller.deletion.cancel}
          yesDisabled={!canMutate || controller.pending}
        />
      )}
    </section>
  );
});
