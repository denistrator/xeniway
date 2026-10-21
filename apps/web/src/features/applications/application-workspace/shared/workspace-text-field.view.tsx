import InlineEdit from "@atlaskit/inline-edit";
import { Button } from "../../../../components/ui/button.view";
import type { WorkspaceTextFieldProps } from "./workspace-text-field.model";
import { useWorkspaceTextField } from "./workspace-text-field.model";
import { workspaceTextFieldStyles } from "./workspace-text-field.styles";

const styles = workspaceTextFieldStyles();
export function WorkspaceTextField(props: WorkspaceTextFieldProps) {
  const view = useWorkspaceTextField(props);
  const readView = () => (
    <div className={view.slotClasses.readView}>
      <p className={view.slotClasses.value}>{view.readValue}</p>
      {view.canMutate && (
        <span aria-hidden="true" className={view.slotClasses.editLabel}>
          {view.editLabel}
        </span>
      )}
    </div>
  );

  return (
    <section
      ref={view.focus.container}
      onFocusCapture={view.focus.onFocusCapture}
      tabIndex={-1}
      aria-labelledby={`${view.id}-heading`}
      className={view.slotClasses.root}
    >
      <view.Heading id={`${view.id}-heading`} className={view.slotClasses.heading}>
        {view.label}
      </view.Heading>
      {!view.canMutate && !view.controller.editing ? (
        readView()
      ) : (
        <InlineEdit<string>
          key={view.controller.editing ? "editing" : "reading"}
          defaultValue={view.controller.savedValue ?? ""}
          isEditing={view.controller.editing}
          keepEditViewOpenOnBlur
          hideActionButtons={!view.canMutate}
          readViewFitContainerWidth
          editButtonLabel={view.label}
          editLabel={view.editLabel}
          confirmButtonLabel={view.saveNamed}
          cancelButtonLabel={view.cancelLabel}
          readView={readView}
          editView={(fieldProps, ref) => (
            <>
              <label htmlFor={view.id} className={styles.label()}>
                {view.label}
              </label>
              <textarea
                id={view.id}
                ref={view.bindInputRef(ref)}
                value={fieldProps.value ?? ""}
                readOnly={!view.canMutate || view.controller.pending}
                rows={5}
                maxLength={10000}
                onChange={view.bindChange(fieldProps)}
                aria-invalid={view.hasError}
                aria-describedby={view.hasError ? `${view.id}-message` : undefined}
                className={view.slotClasses.input}
              />
            </>
          )}
          onEdit={view.beginEdit}
          onCancel={view.controller.cancel}
          onConfirm={view.confirmEdit}
        />
      )}
      {!view.canMutate && view.controller.editing && (
        <div className={styles.offlineActions()}>
          <Button type="button" disabled aria-label={view.saveNamed}>
            {view.saveLabel}
          </Button>
          <Button
            ref={view.focus.readOnlyCancel}
            type="button"
            variant="outline"
            onClick={view.controller.cancel}
            onKeyDown={view.cancelOnEscape}
          >
            {view.cancelLabel}
          </Button>
        </div>
      )}
      {(view.controller.pending || view.feedback) && (
        <p
          id={`${view.id}-message`}
          role={view.hasError ? "alert" : "status"}
          aria-live="polite"
          className={view.slotClasses.feedback}
        >
          {view.controller.pending ? view.savingLabel : view.feedback?.text}
        </p>
      )}
    </section>
  );
}

export type { WorkspaceFieldFeedback, WorkspaceTextFieldController } from "./workspace-text-field.model";
