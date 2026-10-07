import type { ApplicationFollowUpTask } from "@xeniway/shared";
import type { MouseEvent } from "react";
import { useId, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useCanMutate } from "../../../offline/offline-access.tsx";
import { followUpStyles, followUpsSectionStyles } from "./follow-ups-section.styles.ts";
import { useFollowUpsController } from "./use-follow-ups-controller.ts";

const styles = followUpsSectionStyles();

function sortFollowUps(tasks: ApplicationFollowUpTask[]) {
  return [...tasks].sort((left, right) => {
    const leftCompleted = Boolean(left.completedAt);
    const rightCompleted = Boolean(right.completedAt);
    return (
      Number(leftCompleted) - Number(rightCompleted) ||
      (leftCompleted
        ? (left.completedAt ?? "").localeCompare(right.completedAt ?? "")
        : left.dueDate.localeCompare(right.dueDate)) ||
      left.id - right.id
    );
  });
}

export type FollowUpsSectionProps = {
  applicationId: number;
  tasks: ApplicationFollowUpTask[];
};
export function useFollowUpsSection({ applicationId, tasks }: FollowUpsSectionProps) {
  const { i18n, t } = useTranslation();
  const canMutate = useCanMutate();
  const locale = i18n.resolvedLanguage ?? "en";
  const headingId = useId();
  const controller = useFollowUpsController(applicationId);
  const sortedTasks = useMemo(() => sortFollowUps(tasks), [tasks]);
  const monthFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }), [locale]);
  const fullDateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }),
    [locale],
  );
  const statusIsError = controller.status?.endsWith("Failed") ?? false;
  const items = sortedTasks.map((task) => {
    const isCompleted = Boolean(task.completedAt);
    const dueDate = new Date(`${task.dueDate}T00:00:00Z`);
    return {
      task,
      isCompleted,
      dateTitle: fullDateFormatter.format(dueDate),
      month: monthFormatter.format(dueDate),
      day: dueDate.getUTCDate(),
      year: dueDate.getUTCFullYear(),
      taskClassName: styles.task({ className: followUpStyles({ completed: isCompleted }) }),
      statusLabel: t(isCompleted ? "applications.workspace.followUps.done" : "applications.workspace.followUps.open"),
      editLabel: t("applications.workspace.followUps.editNamed", { name: task.title }),
      deleteLabel: t("applications.workspace.followUps.deleteNamed", { name: task.title }),
      completeLabel: t("applications.workspace.followUps.completeNamed", { name: task.title }),
      edit(event: MouseEvent<HTMLButtonElement>) {
        controller.editor.openExisting(task, event.currentTarget);
      },
      remove(event: MouseEvent<HTMLButtonElement>) {
        controller.deletion.request(task, event.currentTarget);
      },
      complete() {
        if (canMutate) {
          void controller.complete(task.id);
        }
      },
    };
  });
  const confirmationText = controller.deletion.target
    ? t("applications.workspace.followUps.deleteConfirmation", { title: controller.deletion.target.title })
    : "";
  function confirmDelete() {
    if (canMutate) {
      void controller.deletion.confirm();
    }
  }
  const headingLabel = t("applications.workspace.followUps.heading");
  const addLabel = t("applications.workspace.followUps.add");
  const emptyLabel = t("applications.workspace.followUps.empty");
  const editLabel = t("applications.workspace.actions.edit");
  const deleteLabel = t("applications.workspace.actions.delete");
  const completeLabel = t("applications.workspace.followUps.complete");
  const savingLabel = t("applications.workspace.actions.saving");
  const statusLabel = controller.status ? t(`applications.workspace.followUps.${controller.status}`) : null;
  const deleteTitleLabel = t("applications.workspace.followUps.deleteTitle");
  const yesLabel = t("common.actions.yes");
  const noLabel = t("common.actions.no");
  return {
    headingId,
    headingLabel,
    addLabel,
    controller,
    canMutate,
    sortedTasks,
    emptyLabel,
    items,
    statusLabel,
    editLabel,
    deleteLabel,
    completeLabel,
    savingLabel,
    statusIsError,
    deleteTitleLabel,
    confirmationText,
    yesLabel,
    noLabel,
    confirmDelete,
  };
}
