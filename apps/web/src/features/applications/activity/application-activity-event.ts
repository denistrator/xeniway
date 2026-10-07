import { useTranslation } from "react-i18next";
import { useCanMutate } from "../../offline/offline-access";
import type { ApplicationActivityEventProps } from "./application-activity.types";
import { applicationActivityEventStyles } from "./application-activity-event.styles";

export function useApplicationActivityEvent({ event, onEdit, onDelete }: ApplicationActivityEventProps) {
  const { t } = useTranslation();
  const canMutate = useCanMutate();
  let statusChange: string | null = null;
  if (event.type === "status_changed" && event.metadata) {
    statusChange = `${t(`applications.status.${event.metadata.from}`)} → ${t(`applications.status.${event.metadata.to}`)}`;
  }

  function edit() {
    onEdit(event);
  }

  function remove() {
    onDelete(event);
  }

  return {
    styles: applicationActivityEventStyles({ system: event.isSystem }),
    typeLabel: t(`applications.activity.types.${event.type}`),
    showActions: !event.isSystem,
    statusChange,
    actionsDisabled: !canMutate,
    edit,
    remove,
    editLabel: t("applications.activity.edit"),
    deleteLabel: t("applications.activity.delete"),
    editName: t("applications.activity.editNamed", { title: event.title }),
    deleteName: t("applications.activity.deleteNamed", { title: event.title }),
  };
}
