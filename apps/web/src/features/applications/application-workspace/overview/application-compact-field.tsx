import InlineEdit from "@atlaskit/inline-edit";
import type { FocusEvent, HTMLInputTypeAttribute, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { FloatingLabel } from "../../../../components/ui/floating-label";
import { Input } from "../../../../components/ui/input";
import { useInlineEditFocus } from "../shared/use-inline-edit-focus";
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
  const controller = fields.fields[field];
  const focus = useInlineEditFocus<HTMLDivElement, HTMLInputElement>(
    controller.editing && fields.compact.activeField === field,
    fields.compact.activeField === null,
  );
  const accessibleLabel = label.replace(/\s*\*$/, "");
  const feedback = getApplicationFieldFeedback(controller, label, t);
  const hasError = feedback?.kind === "error" || feedback?.kind === "invalid";

  function handleBlur(event: FocusEvent<HTMLInputElement>) {
    const target = event.relatedTarget;
    if (target instanceof Node && event.currentTarget.form?.contains(target)) return;
    const requestedField =
      target instanceof HTMLElement
        ? target.closest<HTMLElement>("[data-compact-edit-field]")?.dataset.compactEditField
        : undefined;
    if (fields.compact.warningField !== field) {
      fields.compact.blur(field, requestedField as EditableApplicationField | undefined);
    }
  }

  return (
    <div ref={focus.container} data-compact-edit-field={field} className="workspace-inline-edit min-w-0 text-sm">
      <InlineEdit<string>
        key={controller.editing && fields.compact.activeField === field ? "editing" : "reading"}
        defaultValue={controller.savedValue ?? ""}
        isEditing={controller.editing && fields.compact.activeField === field}
        keepEditViewOpenOnBlur
        isRequired={required}
        editButtonLabel={accessibleLabel}
        editLabel={t("applications.workspace.actions.edit")}
        confirmButtonLabel={t("applications.workspace.saveNamed", { name: accessibleLabel.toLowerCase() })}
        cancelButtonLabel={t("applications.workspace.actions.cancel")}
        readView={() => (
          <div className="break-words text-ink">
            {showLabel && <span className="block font-medium text-muted">{label}</span>}
            <span className={showLabel ? "mt-1 block" : "block"}>
              {displayValue || controller.savedValue || t("applications.workspace.notProvided")}
            </span>
          </div>
        )}
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
        onEdit={() => fields.compact.requestEdit(field)}
        onConfirm={(value) => fields.compact.save(field, value)}
        onCancel={() => fields.compact.cancel(field)}
      />
      {feedback && (
        <p
          id={`${id}-message`}
          role={hasError ? "alert" : "status"}
          aria-live="polite"
          className={`mt-1 text-sm ${hasError ? "text-rose-600" : "text-muted"}`}
        >
          {feedback.text}
        </p>
      )}
    </div>
  );
}
