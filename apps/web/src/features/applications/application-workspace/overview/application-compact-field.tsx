import InlineEdit from "@atlaskit/inline-edit";
import { Button } from "../../../../components/ui/button.tsx";
import { FloatingLabel } from "../../../../components/ui/floating-label.tsx";
import { Input } from "../../../../components/ui/input.tsx";
import { applicationCompactFieldStyles } from "./application-compact-field.styles.ts";
import type { ApplicationCompactFieldProps } from "./application-compact-field.ts";
import { useApplicationCompactField } from "./application-compact-field.ts";

const styles = applicationCompactFieldStyles();
export function ApplicationCompactField(props: ApplicationCompactFieldProps) {
  const view = useApplicationCompactField(props);
  const readView = () => (
    <div className={styles.readView()}>
      {view.showLabel && <span className={styles.label()}>{view.label}</span>}
      <span className={view.slotClasses.value}>{view.readValue}</span>
    </div>
  );

  return (
    <div
      ref={view.focus.container}
      onFocusCapture={view.focus.onFocusCapture}
      tabIndex={-1}
      data-compact-edit-field={view.field}
      className={styles.root()}
    >
      {!view.canMutate && !view.editing ? (
        readView()
      ) : (
        <InlineEdit<string>
          key={view.controller.editing && view.fields.compact.activeField === view.field ? "editing" : "reading"}
          defaultValue={view.controller.savedValue ?? ""}
          isEditing={view.controller.editing && view.fields.compact.activeField === view.field}
          keepEditViewOpenOnBlur
          hideActionButtons={!view.canMutate}
          isRequired={view.required}
          editButtonLabel={view.accessibleLabel}
          editLabel={view.editLabel}
          confirmButtonLabel={view.saveNamed}
          cancelButtonLabel={view.cancelLabel}
          readView={readView}
          editView={(fieldProps, ref) => (
            <FloatingLabel htmlFor={view.id} label={view.label}>
              <Input
                id={view.id}
                ref={view.bindInputRef(ref)}
                name={view.id}
                placeholder=" "
                type={view.type}
                maxLength={view.maxLength}
                required={view.required}
                value={fieldProps.value ?? ""}
                readOnly={!view.canMutate}
                onChange={view.bindChange(fieldProps)}
                onBlur={view.handleBlur}
                aria-invalid={view.hasError}
                aria-describedby={view.hasError ? `${view.id}-message` : undefined}
              />
            </FloatingLabel>
          )}
          onEdit={view.beginEdit}
          onConfirm={view.confirmEdit}
          onCancel={view.cancelEdit}
        />
      )}
      {!view.canMutate && view.editing && (
        <div className={styles.offlineActions()}>
          <Button type="button" disabled aria-label={view.saveNamed}>
            {view.saveLabel}
          </Button>
          <Button
            ref={view.focus.readOnlyCancel}
            type="button"
            variant="outline"
            onClick={view.cancelEdit}
            onKeyDown={view.cancelOnEscape}
          >
            {view.cancelLabel}
          </Button>
        </div>
      )}
      {view.feedback && (
        <p
          id={`${view.id}-message`}
          role={view.hasError ? "alert" : "status"}
          aria-live="polite"
          className={view.slotClasses.feedback}
        >
          {view.feedback.text}
        </p>
      )}
    </div>
  );
}
