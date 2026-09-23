import { useTranslation } from "react-i18next";
import { ApplicationActivity } from "../activity/application-activity";
import { type WorkspaceAction, WorkspaceLifecycleActions } from "./workspace-lifecycle-actions";

export function ApplicationWorkspaceSidebar({
  applicationId,
  board,
  pending,
  onEdit,
  onAction,
}: {
  applicationId: number;
  board: "active" | "archive" | "blacklist";
  pending: boolean;
  onEdit: () => void;
  onAction: (action: WorkspaceAction) => Promise<void>;
}) {
  const { t } = useTranslation();
  return (
    <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-3 font-display text-lg font-semibold text-ink">
          {t("applications.workspace.actionsHeading")}
        </h2>
        <WorkspaceLifecycleActions board={board} pending={pending} onEdit={onEdit} onAction={onAction} />
      </section>
      <ApplicationActivity applicationId={applicationId} />
    </aside>
  );
}
