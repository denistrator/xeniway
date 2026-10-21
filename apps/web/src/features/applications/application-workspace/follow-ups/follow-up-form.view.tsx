import { Input } from "../../../../components/ui/input.view";
import { WorkspaceFieldError, WorkspaceFormActions } from "../shared/workspace-section-ui.view";
import { type FollowUpFormProps, useFollowUpForm } from "./follow-up-form.model";
import { followUpFormStyles } from "./follow-up-form.styles";

const styles = followUpFormStyles();
export function FollowUpForm(props: FollowUpFormProps) {
  const view = useFollowUpForm(props);

  if (!view.editor.target) {
    return null;
  }
  return (
    <form noValidate onSubmit={view.handleSubmit} className={styles.root()}>
      <h3 className={styles.heading()}>{view.heading}</h3>
      <div className={styles.fields()}>
        <div className={styles.titleField()}>
          <label htmlFor={`${view.formId}-title`} className={styles.titleLabel()}>
            {view.taskLabel}
          </label>
          <Input
            id={`${view.formId}-title`}
            ref={view.editor.titleRef}
            name="title"
            readOnly={!view.canMutate || view.controller.pending}
            required
            maxLength={255}
            value={view.editor.draft.title}
            className={view.slotClasses.titleInput}
            aria-invalid={Boolean(view.editor.errors.title) || undefined}
            aria-describedby={view.editor.errors.title ? `${view.formId}-title-error` : undefined}
            onChange={view.changeTitle}
          />
          {view.titleError && <WorkspaceFieldError id={`${view.formId}-title-error`} text={view.titleError} />}
        </div>
        <div className={styles.dateField()}>
          <label htmlFor={`${view.formId}-dueDate`} className={styles.dateLabel()}>
            {view.dueDateLabel}
          </label>
          <Input
            id={`${view.formId}-dueDate`}
            ref={view.editor.dateRef}
            name="dueDate"
            readOnly={!view.canMutate || view.controller.pending}
            type="date"
            required
            value={view.editor.draft.dueDate}
            className={view.slotClasses.dateInput}
            aria-invalid={Boolean(view.editor.errors.dueDate) || undefined}
            aria-describedby={view.editor.errors.dueDate ? `${view.formId}-dueDate-error` : undefined}
            onChange={view.changeDueDate}
          />
          {view.dateError && <WorkspaceFieldError id={`${view.formId}-dueDate-error`} text={view.dateError} />}
        </div>
      </div>
      <div className={styles.notesField()}>
        <label htmlFor={`${view.formId}-notes`} className={styles.notesLabel()}>
          {view.notesLabel}
        </label>
        <textarea
          id={`${view.formId}-notes`}
          name="notes"
          readOnly={!view.canMutate || view.controller.pending}
          rows={3}
          maxLength={10000}
          value={view.editor.draft.notes}
          onChange={view.changeNotes}
          className={styles.notes()}
        />
      </div>
      <WorkspaceFormActions
        pending={view.controller.pending}
        saveLabel={view.saveLabel}
        savingLabel={view.savingLabel}
        cancelLabel={view.cancelLabel}
        onCancel={view.editor.close}
      />
    </form>
  );
}
