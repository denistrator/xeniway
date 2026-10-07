import InlineEdit from "@atlaskit/inline-edit";
import type { FocusEvent, HTMLInputTypeAttribute, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../../components/ui/button";
import { FloatingLabel } from "../../../../components/ui/floating-label";
import { Input } from "../../../../components/ui/input";
import { cn } from "../../../../lib/utils";
import { useCanMutate } from "../../../offline/offline-access";
import { useInlineEditFocus } from "../shared/use-inline-edit-focus";
import { workspaceFieldStyles } from "../shared/workspace-field-styles";
import { getApplicationFieldFeedback } from "./application-field-feedback";
import type { EditableApplicationField } from "./use-application-field";
import type { ApplicationFieldsController } from "./use-application-fields";

type ApplicationCompactFieldProps = {
  fields: ApplicationFieldsController;
  field: EditableApplicationField;
  id: string;
  label: string;
  type: HTMLInputTypeAttribute;
  maxLength: number;
  required: boolean;
  showLabel: boolean;
  displayValue: ReactNode;
};

export function ApplicationCompactField({
  fields,
  field,
  id,
  label,
  type,
  maxLength,
  required,
  showLabel,
  displayValue,
}: ApplicationCompactFieldProps) {
  const { t } = useTranslation();
  const canMutate = useCanMutate();
  const controller = fields.fields[field];
  const editing = controller.editing && fields.compact.activeField === field;
  const focus = useInlineEditFocus<HTMLDivElement, HTMLInputElement>(
    controller.editing && fields.compact.activeField === field,
    fields.compact.activeField === null,
    canMutate,
  );
  const accessibleLabel = label.replace(/\s*\*$/, "");
  const feedback = getApplicationFieldFeedback(controller, label, t);
  const hasError = feedback?.kind === "error" || feedback?.kind === "invalid";
  const readView = () => (
    <div className="break-words text-ink">
      {showLabel && <span className="block font-medium text-muted">{label}</span>}
      <span className={cn("block", showLabel && "mt-1")}>
        {displayValue || controller.savedValue || t("applications.workspace.notProvided")}
      </span>
    </div>
  );

  function handleBlur(event: FocusEvent<HTMLInputElement>) {
    const target = event.relatedTarget;
    if (target instanceof Node && event.currentTarget.form?.contains(target)) {
      return;
    }
    const requestedField =
      target instanceof HTMLElement
        ? target.closest<HTMLElement>("[data-compact-edit-field]")?.dataset.compactEditField
        : undefined;
    if (fields.compact.warningField !== field) {
      fields.compact.blur(field, requestedField as EditableApplicationField | undefined);
    }
  }

  return (
    <div
      ref={focus.container}
      onFocusCapture={focus.onFocusCapture}
      tabIndex={-1}
      data-compact-edit-field={field}
      className="workspace-inline-edit min-w-0 text-sm focus-visible:outline-2"
    >
      {!canMutate && !editing ? (
        readView()
      ) : (
        <InlineEdit<string>
          key={controller.editing && fields.compact.activeField === field ? "editing" : "reading"}
          defaultValue={controller.savedValue ?? ""}
          isEditing={controller.editing && fields.compact.activeField === field}
          keepEditViewOpenOnBlur
          hideActionButtons={!canMutate}
          isRequired={required}
          editButtonLabel={accessibleLabel}
          editLabel={t("applications.workspace.actions.edit")}
          confirmButtonLabel={t("applications.workspace.saveNamed", { name: accessibleLabel.toLowerCase() })}
          cancelButtonLabel={t("applications.workspace.actions.cancel")}
          readView={readView}
          editView={(fieldProps, ref) => (
            <FloatingLabel htmlFor={id} label={label}>
              <Input
                id={id}
                ref={(element) => {
                  ref.current = element;
                  focus.input.current = element;
                }}
                name={id}
                placeholder=" "
                type={type}
                maxLength={maxLength}
                required={required}
                value={fieldProps.value ?? ""}
                readOnly={!canMutate}
                onChange={(event) => {
                  fieldProps.onChange(event.target.value);
                  controller.setDraft(event.target.value);
                }}
                onBlur={handleBlur}
                aria-invalid={hasError}
                aria-describedby={hasError ? `${id}-message` : undefined}
              />
            </FloatingLabel>
          )}
          onEdit={() => {
            if (canMutate) {
              fields.compact.requestEdit(field);
            }
          }}
          onConfirm={(value) => {
            if (canMutate) {
              fields.compact.save(field, value);
            }
          }}
          onCancel={() => fields.compact.cancel(field)}
        />
      )}
      {!canMutate && editing && (
        <div className="mt-2 flex gap-2">
          <Button
            type="button"
            disabled
            aria-label={t("applications.workspace.saveNamed", { name: accessibleLabel.toLowerCase() })}
          >
            {t("applications.workspace.actions.save")}
          </Button>
          <Button
            ref={focus.readOnlyCancel}
            type="button"
            variant="outline"
            onClick={() => fields.compact.cancel(field)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                fields.compact.cancel(field);
              }
            }}
          >
            {t("applications.workspace.actions.cancel")}
          </Button>
        </div>
      )}
      {feedback && (
        <p
          id={`${id}-message`}
          role={hasError ? "alert" : "status"}
          aria-live="polite"
          className={workspaceFieldStyles({ error: hasError }).feedback({ className: "mt-1" })}
        >
          {feedback.text}
        </p>
      )}
    </div>
  );
}
