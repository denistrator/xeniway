import type { ApplicationFollowUpTask } from "@xeniway/shared";
import { useTranslation } from "react-i18next";
import { WorkspaceDeleteConfirmation } from "./workspace-delete-confirmation";

export function FollowUpDeleteDialog({
  task,
  pending,
  onDelete,
  onCancel,
}: {
  task: ApplicationFollowUpTask;
  pending: boolean;
  onDelete: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  return (
    <WorkspaceDeleteConfirmation
      title={t("applications.workspace.followUps.deleteTitle")}
      text={t("applications.workspace.followUps.deleteConfirmation", { title: task.title })}
      yesLabel={t("common.actions.yes")}
      noLabel={t("common.actions.no")}
      onYes={onDelete}
      onNo={onCancel}
      pending={pending}
    />
  );
}
