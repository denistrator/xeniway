import type { ApplicationFollowUpTask } from "@xeniway/shared";
import { memo, useId, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { tv } from "tailwind-variants";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent } from "../../../../components/ui/card";
import { ConfirmationModal } from "../../../../components/ui/confirmation-modal";
import { emptyStateStyles } from "../../../../components/ui/surface-styles";
import { useCanMutate } from "../../../offline/offline-access";
import { WorkspaceMutationStatus, WorkspaceSectionHeader } from "../shared/workspace-section-ui";
import { FollowUpForm } from "./follow-up-form";
import { useFollowUpsController } from "./use-follow-ups-controller";

const followUpStyles = tv({
  base: "flex flex-wrap items-start gap-4 rounded-xl border border-line p-4",
  variants: { completed: { true: "bg-surface-tint", false: "bg-surface" } },
});

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

export const FollowUpsSection = memo(function FollowUpsSection({
  applicationId,
  tasks,
}: {
  applicationId: number;
  tasks: ApplicationFollowUpTask[];
}) {
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

  return (
    <section tabIndex={-1} aria-labelledby={headingId} className="focus-visible:outline-2">
      <Card>
        <WorkspaceSectionHeader
          headingId={headingId}
          title={t("applications.workspace.followUps.heading")}
          actionLabel={t("applications.workspace.followUps.add")}
          actionRef={controller.addButtonRef}
          actionDisabled={!canMutate || controller.editor.target !== null}
          onAction={controller.editor.openNew}
        />
        <CardContent>
          <FollowUpForm controller={controller} />
          {sortedTasks.length === 0 ? (
            <p className={emptyStateStyles()}>{t("applications.workspace.followUps.empty")}</p>
          ) : (
            <ul className="space-y-3">
              {sortedTasks.map((task) => {
                const isCompleted = Boolean(task.completedAt);
                const dueDate = new Date(`${task.dueDate}T00:00:00Z`);
                return (
                  <li key={task.id} className={followUpStyles({ completed: isCompleted })}>
                    <time
                      dateTime={task.dueDate}
                      title={fullDateFormatter.format(dueDate)}
                      className="flex min-w-14 flex-col items-center rounded-lg border border-accent-warm/40 bg-surface-tint px-2 py-1 text-center text-ink"
                    >
                      <span className="text-[0.68rem] font-semibold uppercase tracking-wide text-muted">
                        {monthFormatter.format(dueDate)}
                      </span>
                      <span className="font-display text-2xl leading-none">{dueDate.getUTCDate()}</span>
                      <span className="text-[0.65rem] text-muted">{dueDate.getUTCFullYear()}</span>
                    </time>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="font-display text-lg text-ink">{task.title}</h3>
                          <span className="text-xs font-semibold text-muted">
                            {t(
                              isCompleted
                                ? "applications.workspace.followUps.done"
                                : "applications.workspace.followUps.open",
                            )}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            aria-label={t("applications.workspace.followUps.editNamed", { name: task.title })}
                            disabled={!canMutate}
                            onClick={(event) => controller.editor.openExisting(task, event.currentTarget)}
                          >
                            {t("applications.workspace.actions.edit")}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            aria-label={t("applications.workspace.followUps.deleteNamed", { name: task.title })}
                            disabled={!canMutate}
                            onClick={(event) => controller.deletion.request(task, event.currentTarget)}
                          >
                            {t("applications.workspace.actions.delete")}
                          </Button>
                        </div>
                      </div>
                      {task.notes && (
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">{task.notes}</p>
                      )}
                      {!isCompleted && (
                        <Button
                          type="button"
                          size="sm"
                          className="mt-3"
                          disabled={!canMutate || controller.pending}
                          aria-label={t("applications.workspace.followUps.completeNamed", { name: task.title })}
                          onClick={() => {
                            if (canMutate) {
                              void controller.complete(task.id);
                            }
                          }}
                        >
                          {t("applications.workspace.followUps.complete")}
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <WorkspaceMutationStatus
            pending={controller.pending}
            pendingText={t("applications.workspace.actions.saving")}
            text={controller.status ? t(`applications.workspace.followUps.${controller.status}`) : null}
            isError={statusIsError}
          />
        </CardContent>
      </Card>
      {controller.deletion.target && (
        <ConfirmationModal
          title={t("applications.workspace.followUps.deleteTitle")}
          text={t("applications.workspace.followUps.deleteConfirmation", { title: controller.deletion.target.title })}
          yesLabel={t("common.actions.yes")}
          noLabel={t("common.actions.no")}
          onYes={() => {
            if (canMutate) {
              void controller.deletion.confirm();
            }
          }}
          onNo={controller.deletion.cancel}
          yesDisabled={!canMutate || controller.pending}
        />
      )}
    </section>
  );
});
