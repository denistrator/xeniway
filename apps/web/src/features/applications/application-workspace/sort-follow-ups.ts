import type { ApplicationFollowUpTask } from "@xeniway/shared";

export function sortFollowUps(tasks: ApplicationFollowUpTask[], locallyCompleted: number[]) {
  return [...tasks].sort((a, b) => {
    const aDone = Boolean(a.completedAt || locallyCompleted.includes(a.id));
    const bDone = Boolean(b.completedAt || locallyCompleted.includes(b.id));
    return (
      Number(aDone) - Number(bDone) ||
      (aDone ? (a.completedAt ?? "").localeCompare(b.completedAt ?? "") : a.dueDate.localeCompare(b.dueDate)) ||
      a.id - b.id
    );
  });
}
