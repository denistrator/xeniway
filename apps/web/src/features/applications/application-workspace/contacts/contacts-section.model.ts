import type { ApplicationContact } from "@xeniway/shared";
import type { MouseEvent } from "react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { useCanMutate } from "../../../offline/offline-access.view";
import { sanitizeExternalUrl } from "../shared/sanitize-external-url";
import { useContactsController } from "./use-contacts-controller";

export type ContactsSectionProps = {
  applicationId: number;
  contacts: ApplicationContact[];
};
export function useContactsSection({ applicationId, contacts }: ContactsSectionProps) {
  const { t } = useTranslation();
  const canMutate = useCanMutate();
  const headingId = useId();
  const controller = useContactsController(applicationId);
  const isEditorOpen = controller.editor.target !== null;
  const statusIsError = controller.status?.endsWith("Failed") ?? false;
  const items = contacts.map((contact) => ({
    contact,
    safeProfileUrl: sanitizeExternalUrl(contact.profileUrl),
    emailHref: `mailto:${contact.email}`,
    phoneHref: `tel:${contact.phone?.replace(/[^+\d]/g, "")}`,
    editLabel: t("applications.workspace.contacts.editNamed", { name: contact.name }),
    removeLabel: t("applications.workspace.contacts.removeNamed", { name: contact.name }),
    profileLabel: t("applications.workspace.contacts.profileNamed", { name: contact.name }),
    edit(event: MouseEvent<HTMLButtonElement>) {
      controller.editor.openExisting(contact, event.currentTarget);
    },
    remove(event: MouseEvent<HTMLButtonElement>) {
      controller.deletion.request(contact, event.currentTarget);
    },
  }));
  const confirmationText = controller.deletion.target
    ? t("applications.workspace.contacts.removeConfirmation", { name: controller.deletion.target.name })
    : "";
  function confirmDelete() {
    if (canMutate) {
      void controller.deletion.confirm();
    }
  }
  const headingLabel = t("applications.workspace.contacts.heading");
  const addLabel = t("applications.workspace.contacts.add");
  const emptyLabel = t("applications.workspace.contacts.empty");
  const editLabel = t("applications.workspace.actions.edit");
  const removeLabel = t("applications.workspace.actions.remove");
  const profileLabel = t("applications.workspace.contacts.profile");
  const savingLabel = t("applications.workspace.actions.saving");
  const statusLabel = controller.status ? t(`applications.workspace.contacts.${controller.status}`) : null;
  const removeTitleLabel = t("applications.workspace.contacts.removeTitle");
  const yesLabel = t("common.actions.yes");
  const noLabel = t("common.actions.no");
  return {
    headingId,
    headingLabel,
    addLabel,
    controller,
    canMutate,
    isEditorOpen,
    contacts,
    emptyLabel,
    items,
    editLabel,
    removeLabel,
    profileLabel,
    savingLabel,
    statusLabel,
    statusIsError,
    removeTitleLabel,
    confirmationText,
    yesLabel,
    noLabel,
    confirmDelete,
  };
}
