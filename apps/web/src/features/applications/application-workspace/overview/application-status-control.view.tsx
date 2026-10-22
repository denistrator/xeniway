import { type ApplicationStatusControlProps, useApplicationStatusControl } from "./application-status-control.model";
import { applicationStatusControlStyles } from "./application-status-control.styles";

const styles = applicationStatusControlStyles();
export function ApplicationStatusControl(props: ApplicationStatusControlProps) {
  const view = useApplicationStatusControl(props);

  return (
    <div ref={view.menuRef} tabIndex={-1} data-compact-edit-field="status" className={styles.root()}>
      <button
        ref={view.triggerRef}
        type="button"
        aria-label={view.triggerLabel}
        aria-haspopup="dialog"
        aria-expanded={view.isOpen}
        aria-controls="application-status-options"
        disabled={!view.canMutate || view.fields.fields.status.pending}
        onClick={view.toggleStatus}
        className={styles.trigger()}
      >
        <span aria-hidden="true" className={view.slotClasses.marker} />
        {view.statusLabel}
      </button>
      {view.isOpen && (
        <fieldset id="application-status-options" className={styles.options()}>
          <legend className={styles.legend()}>{view.legendLabel}</legend>
          {view.options.map(({ option, label, selected, onChange, markerClassName }) => (
            <label key={option} className={styles.option()}>
              <input
                ref={selected ? view.selectedOptionRef : undefined}
                type="radio"
                name="application-status"
                value={option}
                checked={selected}
                disabled={!view.canMutate || view.fields.fields.status.pending}
                onChange={onChange}
                className={styles.input()}
              />
              <span aria-hidden="true" className={markerClassName} />
              {label}
            </label>
          ))}
        </fieldset>
      )}
      {view.feedback?.kind === "error" && (
        <p role="alert" className={styles.feedback()}>
          {view.feedback.text}
        </p>
      )}
    </div>
  );
}
