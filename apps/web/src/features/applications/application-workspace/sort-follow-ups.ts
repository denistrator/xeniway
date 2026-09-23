import type { ApplicationFollowUpTask } from "@xeniway/shared";

export function sortFollowUps(tasks: ApplicationFollowUpTask[]) {
  return [...tasks].sort((a, b) => {
    const aDone = Boolean(a.completedAt);
    const bDone = Boolean(b.completedAt);
    return (
      Number(aDone) - Number(bDone) ||
      (aDone ? (a.completedAt ?? "").localeCompare(b.completedAt ?? "") : a.dueDate.localeCompare(b.dueDate)) ||
      a.id - b.id
    );
  });
}
