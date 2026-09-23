import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../../components/ui/button";
import { WorkspaceActionConfirmation } from "./workspace-action-confirmation";
import { WorkspaceRestoreButton } from "./workspace-restore-button";

export type WorkspaceAction = "archive" | "blacklist" | "restore" | "delete";

export function WorkspaceLifecycleActions({
  board,
  pending,
  onEdit,
  onAction,
}: {
  board: "active" | "archive" | "blacklist";
  pending: boolean;
  onEdit: () => void;
  onAction: (action: WorkspaceAction) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState<WorkspaceAction | null>(null);
  const labels: Record<WorkspaceAction, string> = {
    archive: t("applications.workspace.archive"),
    blacklist: t("applications.workspace.blacklist"),
    restore: t("applications.workspace.restore"),
    delete: t("applications.workspace.delete"),
  };
  return (
    <>
      <nav aria-label={t("applications.workspace.actionsLabel")} className="flex flex-wrap gap-2">
        {board === "active" ? (
          <>
            <Button variant="outline" onClick={onEdit}>
              {t("applications.workspace.edit")}
            </Button>
            <Button variant="outline" onClick={() => setConfirming("archive")}>
              {labels.archive}
            </Button>
            <Button variant="ghost" onClick={() => setConfirming("blacklist")}>
              {labels.blacklist}
            </Button>
          </>
        ) : (
          <>
            <WorkspaceRestoreButton label={labels.restore} pending={pending} onRestore={() => onAction("restore")} />
            <Button variant="outline" onClick={() => setConfirming("delete")}>
              {labels.delete}
            </Button>
          </>
        )}
      </nav>
      {confirming && (
        <WorkspaceActionConfirmation
          action={confirming}
          label={labels[confirming]}
          pending={pending}
          onConfirm={onAction}
          onClose={() => setConfirming(null)}
        />
      )}
    </>
  );
}
