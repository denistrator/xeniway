import type { ApplicationFollowUpTask } from "@xeniway/shared";
import { useTranslation } from "react-i18next";
import { FollowUpCard } from "./follow-up-card";

export function FollowUpList({
  tasks,
  locallyCompleted,
  pending,
  onEdit,
  onComplete,
  onDelete,
}: {
  tasks: ApplicationFollowUpTask[];
  locallyCompleted: number[];
  pending: boolean;
  onEdit: (task: ApplicationFollowUpTask) => void;
  onComplete: (id: number) => void;
  onDelete: (task: ApplicationFollowUpTask) => void;
}) {
  const { t } = useTranslation();
  if (!tasks.length)
    return (
      <p className="rounded-xl border border-dashed border-line p-5 text-sm text-muted">
        {t("applications.workspace.followUps.empty")}
      </p>
    );
  return (
    <ul className="space-y-3">
      {tasks.map((task) => (
        <FollowUpCard
          key={task.id}
          task={task}
          completed={Boolean(task.completedAt || locallyCompleted.includes(task.id))}
          pending={pending}
          onEdit={() => onEdit(task)}
          onComplete={() => onComplete(task.id)}
          onDelete={() => onDelete(task)}
        />
      ))}
    </ul>
  );
}
