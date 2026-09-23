import type { ApplicationFollowUpTask } from "@xeniway/shared";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/ui/button";
import { DueDateMarker } from "./due-date-marker";

export function FollowUpCard({
  task,
  completed,
  pending,
  onEdit,
  onComplete,
  onDelete,
}: {
  task: ApplicationFollowUpTask;
  completed: boolean;
  pending: boolean;
  onEdit: () => void;
  onComplete: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  return (
    <li
      className={`flex flex-wrap items-start gap-4 rounded-xl border border-line p-4 ${completed ? "bg-surface-tint" : "bg-surface"}`}
    >
      <DueDateMarker dueDate={task.dueDate} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="font-display text-lg text-ink">{task.title}</h3>
            <span className="text-xs font-semibold text-muted">
              {t(completed ? "applications.workspace.followUps.done" : "applications.workspace.followUps.open")}
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-label={t("applications.workspace.followUps.editNamed", { name: task.title })}
              onClick={onEdit}
            >
              {t("applications.workspace.actions.edit")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-label={t("applications.workspace.followUps.deleteNamed", { name: task.title })}
              onClick={onDelete}
            >
              {t("applications.workspace.actions.delete")}
            </Button>
          </div>
        </div>
        {task.notes && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">{task.notes}</p>}
        {!completed && (
          <Button
            type="button"
            size="sm"
            className="mt-3"
            disabled={pending}
            aria-label={t("applications.workspace.followUps.completeNamed", { name: task.title })}
            onClick={onComplete}
          >
            {t("applications.workspace.followUps.complete")}
          </Button>
        )}
      </div>
    </li>
  );
}
