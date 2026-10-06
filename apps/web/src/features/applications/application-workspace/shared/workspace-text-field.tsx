import InlineEdit from "@atlaskit/inline-edit";
import { useTranslation } from "react-i18next";
import { textAreaStyles } from "../../../../components/ui/field-styles";
import { useInlineEditFocus } from "./use-inline-edit-focus";
import { workspaceFieldStyles } from "./workspace-field-styles";

export type WorkspaceTextFieldController = {
  savedValue: string | null;
  draft: string;
  editing: boolean;
  pending: boolean;
  state: "error" | "invalid" | null;
  setDraft(value: string): void;
  beginEdit(): void;
  cancel(): void;
  save(value?: string): Promise<unknown>;
};

export type WorkspaceFieldFeedback = {
  kind: "error" | "invalid";
  text: string;
} | null;

type WorkspaceTextFieldProps = {
  id: string;
  label: string;
  headingLevel: 2 | 3;
  className: string;
  headingClassName: string;
  controller: WorkspaceTextFieldController;
  feedback: WorkspaceFieldFeedback;
};

export function WorkspaceTextField({
  id,
  label,
  headingLevel,
  className,
  headingClassName,
  controller,
  feedback,
}: WorkspaceTextFieldProps) {
  const { t } = useTranslation();
  const focus = useInlineEditFocus<HTMLElement, HTMLTextAreaElement>(controller.editing);
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const hasError = feedback?.kind === "error" || feedback?.kind === "invalid";
  const styles = workspaceFieldStyles({ error: hasError });

  return (
    <section ref={focus.container} aria-labelledby={`${id}-heading`} className={styles.root({ className })}>
      <Heading id={`${id}-heading`} className={styles.heading({ className: headingClassName })}>
        {label}
      </Heading>
      <InlineEdit<string>
        key={controller.editing ? "editing" : "reading"}
        defaultValue={controller.savedValue ?? ""}
        isEditing={controller.editing}
        keepEditViewOpenOnBlur
        readViewFitContainerWidth
        editButtonLabel={label}
        editLabel={t("applications.workspace.actions.edit")}
        confirmButtonLabel={t("applications.workspace.saveNamed", { name: label.toLowerCase() })}
        cancelButtonLabel={t("applications.workspace.actions.cancel")}
        readView={() => (
          <div className={styles.readView()}>
            <p className={styles.value()}>{controller.savedValue || t("applications.workspace.notProvided")}</p>
            <span aria-hidden="true" className={styles.editLabel()}>
              {t("applications.workspace.actions.edit")}
            </span>
          </div>
        )}
        editView={(fieldProps, ref) => (
          <>
            <label htmlFor={id} className="sr-only">
              {label}
            </label>
            <textarea
              id={id}
              ref={(element) => {
                ref.current = element;
                focus.input.current = element;
              }}
              value={fieldProps.value ?? ""}
              rows={5}
              maxLength={10000}
              onChange={(event) => {
                fieldProps.onChange(event.target.value);
                controller.setDraft(event.target.value);
              }}
              aria-invalid={hasError}
              aria-describedby={hasError ? `${id}-message` : undefined}
              className={textAreaStyles({ className: "leading-6" })}
            />
          </>
        )}
        onEdit={controller.beginEdit}
        onCancel={controller.cancel}
        onConfirm={(value) => void controller.save(value)}
      />
      {(controller.pending || feedback) && (
        <p
          id={`${id}-message`}
          role={hasError ? "alert" : "status"}
          aria-live="polite"
          className={styles.feedback({ className: "mt-2" })}
        >
          {controller.pending ? t("applications.workspace.actions.saving") : feedback?.text}
        </p>
      )}
    </section>
  );
}
