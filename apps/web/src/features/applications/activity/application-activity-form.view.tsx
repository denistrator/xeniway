import type { ApplicationActivityFormProps } from "./application-activity.types";
import { useApplicationActivityForm } from "./application-activity-form.model";

export function ApplicationActivityForm({
  event,
  onSubmit,
  onCancel,
  onDirtyChange = () => undefined,
  onSaveRequest = () => undefined,
}: ApplicationActivityFormProps) {
  const form = useApplicationActivityForm(event, onSubmit, onDirtyChange, onSaveRequest);
  const styles = form.styles;
  return (
    <form className={styles.root()} onSubmit={form.handleSubmit}>
      <label className={styles.typeLabel()} htmlFor="activity-type">
        {form.typeLabel}
      </label>
      <select
        ref={form.initialFocus}
        id="activity-type"
        name="type"
        disabled={form.fieldsReadOnly}
        className={styles.typeSelect()}
        value={form.type}
        onChange={form.changeType}
      >
        {form.typeOptions.map((option) => (
          <option key={option.value} value={option.value} className={styles.typeOption()}>
            {option.label}
          </option>
        ))}
      </select>
      <label className={styles.titleLabel()} htmlFor="activity-title">
        {form.titleLabel}
      </label>
      <input
        id="activity-title"
        name="title"
        readOnly={form.fieldsReadOnly}
        className={styles.titleInput()}
        required
        maxLength={255}
        value={form.title}
        onChange={form.changeTitle}
      />
      <label className={styles.descriptionLabel()} htmlFor="activity-description">
        {form.descriptionLabel}
      </label>
      <textarea
        id="activity-description"
        name="description"
        readOnly={form.fieldsReadOnly}
        className={styles.descriptionInput()}
        maxLength={10000}
        value={form.description}
        onChange={form.changeDescription}
      />
      <label className={styles.occurredAtLabel()} htmlFor="activity-occurred-at">
        {form.occurredAtLabel}
      </label>
      <input
        id="activity-occurred-at"
        name="occurredAt"
        readOnly={form.fieldsReadOnly}
        type="datetime-local"
        className={styles.occurredAtInput()}
        required
        value={form.occurredAt}
        onChange={form.changeOccurredAt}
      />
      {form.errorLabel && (
        <p role="alert" className={styles.error()}>
          {form.errorLabel}
        </p>
      )}
      <div className={styles.actions()}>
        <button type="button" className={styles.cancelButton()} onClick={onCancel}>
          {form.cancelLabel}
        </button>
        <button type="submit" disabled={form.saveDisabled} className={styles.saveButton()}>
          {form.saveLabel}
        </button>
      </div>
    </form>
  );
}
