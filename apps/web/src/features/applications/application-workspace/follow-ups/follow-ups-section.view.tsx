import { memo } from "react";
import { Button } from "../../../../components/ui/button.view";
import { Card, CardContent } from "../../../../components/ui/card.view";
import { ConfirmationModal } from "../../../../components/ui/confirmation-modal.view";
import { WorkspaceMutationStatus, WorkspaceSectionHeader } from "../shared/workspace-section-ui.view";
import { FollowUpForm } from "./follow-up-form.view";
import { type FollowUpsSectionProps, useFollowUpsSection } from "./follow-ups-section.model";
import { followUpsSectionStyles } from "./follow-ups-section.styles";

const styles = followUpsSectionStyles();
export const FollowUpsSection = memo(function FollowUpsSection(props: FollowUpsSectionProps) {
  const view = useFollowUpsSection(props);

  return (
    <section tabIndex={-1} aria-labelledby={view.headingId} className={styles.root()}>
      <Card>
        <WorkspaceSectionHeader
          headingId={view.headingId}
          title={view.headingLabel}
          actionLabel={view.addLabel}
          actionRef={view.controller.addButtonRef}
          actionDisabled={!view.canMutate || view.controller.editor.target !== null}
          onAction={view.controller.editor.openNew}
        />
        <CardContent>
          <FollowUpForm controller={view.controller} />
          {view.sortedTasks.length === 0 ? (
            <p className={styles.empty()}>{view.emptyLabel}</p>
          ) : (
            <ul className={styles.list()}>
              {view.items.map(
                ({
                  task,
                  isCompleted,
                  dateTitle,
                  month,
                  day,
                  year,
                  statusLabel,
                  editLabel,
                  deleteLabel,
                  completeLabel,
                  edit,
                  remove,
                  complete,
                  taskClassName,
                }) => (
                  <li key={task.id} className={taskClassName}>
                    <time dateTime={task.dueDate} title={dateTitle} className={styles.date()}>
                      <span className={styles.month()}>{month}</span>
                      <span className={styles.day()}>{day}</span>
                      <span className={styles.year()}>{year}</span>
                    </time>
                    <div className={styles.content()}>
                      <div className={styles.header()}>
                        <div className={styles.identity()}>
                          <h3 className={styles.title()}>{task.title}</h3>
                          <span className={styles.status()}>{statusLabel}</span>
                        </div>
                        <div className={styles.actions()}>
                          <Button
                            data-follow-up-edit-action
                            type="button"
                            size="sm"
                            variant="outline"
                            aria-label={editLabel}
                            disabled={!view.canMutate}
                            onClick={edit}
                          >
                            {view.editLabel}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            aria-label={deleteLabel}
                            disabled={!view.canMutate}
                            onClick={remove}
                          >
                            {view.deleteLabel}
                          </Button>
                        </div>
                      </div>
                      {task.notes && <p className={styles.notes()}>{task.notes}</p>}
                      {!isCompleted && (
                        <Button
                          type="button"
                          size="sm"
                          className={styles.complete()}
                          disabled={!view.canMutate || view.controller.pending}
                          aria-label={completeLabel}
                          onClick={complete}
                        >
                          {view.completeLabel}
                        </Button>
                      )}
                    </div>
                  </li>
                ),
              )}
            </ul>
          )}
          <WorkspaceMutationStatus
            pending={view.controller.pending}
            pendingText={view.savingLabel}
            text={view.controller.status ? view.statusLabel : null}
            isError={view.statusIsError}
          />
        </CardContent>
      </Card>
      {view.controller.deletion.target && (
        <ConfirmationModal
          title={view.deleteTitleLabel}
          text={view.confirmationText}
          yesLabel={view.yesLabel}
          noLabel={view.noLabel}
          onYes={view.confirmDelete}
          onNo={view.controller.deletion.cancel}
          yesDisabled={!view.canMutate || view.controller.pending}
        />
      )}
      {view.controller.warning.isOpen && (
        <ConfirmationModal
          title={view.unsavedChangesTitle}
          text={view.unsavedChangesText}
          yesLabel={view.saveChangesLabel}
          noLabel={view.discardChangesLabel}
          onYes={view.controller.editor.savePending}
          onNo={view.controller.warning.discard}
          dismissAction={view.dismissWarning}
          returnFocusRef={view.controller.warning.returnFocusRef}
          yesDisabled={!view.canMutate || view.controller.pending}
        />
      )}
    </section>
  );
});
