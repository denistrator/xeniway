import { Input } from "../../../../components/ui/input.view";
import { WorkspaceFieldError, WorkspaceFormActions } from "../shared/workspace-section-ui.view";
import { type ContactFormProps, useContactForm } from "./contact-form.model";
import { contactFormStyles } from "./contact-form.styles";

const styles = contactFormStyles();
export function ContactForm(props: ContactFormProps) {
  const view = useContactForm(props);

  if (!view.editor.target) {
    return null;
  }
  return (
    <form ref={view.editor.formRef} noValidate onSubmit={view.handleSubmit} className={styles.root()}>
      <h3 className={styles.heading()}>{view.heading}</h3>
      <div className={styles.fields()}>
        {view.fields.map(
          ({
            field,
            id,
            label,
            attributes,
            required,
            error,
            invalid,
            errorId,
            fieldClassName,
            inputClassName,
            onChange,
          }) => (
            <div key={field} className={fieldClassName}>
              <label htmlFor={id} className={styles.label()}>
                {label}
              </label>
              <Input
                id={id}
                ref={field === "name" ? view.editor.firstFieldRef : undefined}
                name={field}
                readOnly={!view.canMutate}
                {...attributes}
                required={required}
                value={view.editor.draft[field]}
                className={inputClassName}
                aria-invalid={invalid || undefined}
                aria-describedby={error ? errorId : undefined}
                onChange={onChange}
              />
              {error && <WorkspaceFieldError id={errorId} text={error} />}
            </div>
          ),
        )}
      </div>
      <div className={styles.notesField()}>
        <label htmlFor={`${view.formId}-notes`} className={styles.notesLabel()}>
          {view.notesLabel}
        </label>
        <textarea
          id={`${view.formId}-notes`}
          name="notes"
          readOnly={!view.canMutate}
          rows={3}
          maxLength={10000}
          value={view.editor.draft.notes}
          aria-invalid={Boolean(view.editor.errors.notes) || undefined}
          aria-describedby={view.editor.errors.notes ? `${view.formId}-notes-error` : undefined}
          onChange={view.changeNotes}
          className={view.slotClasses.notes}
        />
        {view.notesError && <WorkspaceFieldError id={`${view.formId}-notes-error`} text={view.notesError} />}
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
