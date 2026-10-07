import { memo } from "react";
import { Button } from "../../../../components/ui/button.tsx";
import { Card, CardContent } from "../../../../components/ui/card.tsx";
import { ConfirmationModal } from "../../../../components/ui/confirmation-modal.tsx";
import { WorkspaceMutationStatus, WorkspaceSectionHeader } from "../shared/workspace-section-ui.tsx";
import { ContactForm } from "./contact-form.tsx";
import { contactsSectionStyles } from "./contacts-section.styles.ts";

import { type ContactsSectionProps, useContactsSection } from "./contacts-section.ts";

const styles = contactsSectionStyles();
export const ContactsSection = memo(function ContactsSection(props: ContactsSectionProps) {
  const view = useContactsSection(props);

  return (
    <section tabIndex={-1} aria-labelledby={view.headingId} className={styles.root()}>
      <Card>
        <WorkspaceSectionHeader
          headingId={view.headingId}
          title={view.headingLabel}
          actionLabel={view.addLabel}
          actionRef={view.controller.addButtonRef}
          actionDisabled={!view.canMutate || view.isEditorOpen}
          onAction={view.controller.editor.openNew}
        />
        <CardContent>
          <ContactForm controller={view.controller} />
          {view.contacts.length === 0 ? (
            <p className={styles.empty()}>{view.emptyLabel}</p>
          ) : (
            <ul className={styles.list()}>
              {view.items.map(
                ({
                  contact,
                  safeProfileUrl,
                  phoneHref,
                  emailHref,
                  editLabel,
                  removeLabel,
                  profileLabel,
                  edit,
                  remove,
                }) => (
                  <li key={contact.id} className={styles.contact()}>
                    <div className={styles.header()}>
                      <div className={styles.identity()}>
                        <h3 className={styles.name()}>{contact.name}</h3>
                        <p className={styles.role()}>{contact.role}</p>
                      </div>
                      <div className={styles.actions()}>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          aria-label={editLabel}
                          disabled={!view.canMutate}
                          onClick={edit}
                        >
                          {view.editLabel}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          aria-label={removeLabel}
                          disabled={!view.canMutate}
                          onClick={remove}
                        >
                          {view.removeLabel}
                        </Button>
                      </div>
                    </div>
                    <div className={styles.links()}>
                      {contact.email && (
                        <a className={styles.email()} href={emailHref}>
                          {contact.email}
                        </a>
                      )}
                      {contact.phone && (
                        <a className={styles.phone()} href={phoneHref}>
                          {contact.phone}
                        </a>
                      )}
                      {safeProfileUrl && (
                        <a
                          className={styles.profile()}
                          href={safeProfileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={profileLabel}
                        >
                          {view.profileLabel}
                        </a>
                      )}
                    </div>
                    {contact.notes && <p className={styles.notes()}>{contact.notes}</p>}
                  </li>
                ),
              )}
            </ul>
          )}
          <WorkspaceMutationStatus
            pending={view.controller.pending}
            pendingText={view.savingLabel}
            text={view.controller.status ? view.statusLabel : null}
            isError={view.statusIsError}
          />
        </CardContent>
      </Card>
      {view.controller.deletion.target && (
        <ConfirmationModal
          title={view.removeTitleLabel}
          text={view.confirmationText}
          yesLabel={view.yesLabel}
          noLabel={view.noLabel}
          onYes={view.confirmDelete}
          onNo={view.controller.deletion.cancel}
          yesDisabled={!view.canMutate || view.controller.pending}
        />
      )}
    </section>
  );
});
