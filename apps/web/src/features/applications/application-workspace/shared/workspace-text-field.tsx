import InlineEdit from "@atlaskit/inline-edit";
import { useTranslation } from "react-i18next";
import { useInlineEditFocus } from "./use-inline-edit-focus";

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

  return (
    <section ref={focus.container} aria-labelledby={`${id}-heading`} className={`workspace-inline-edit ${className}`}>
      <Heading id={`${id}-heading`} className={headingClassName}>
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
          <div className="flex items-start justify-between gap-3">
            <p className="whitespace-pre-wrap text-sm leading-6 text-muted">
              {controller.savedValue || t("applications.workspace.notProvided")}
            </p>
            <span
              aria-hidden="true"
              className="shrink-0 rounded-lg border border-line px-2 py-1 text-sm font-medium text-ink"
            >
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
              className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm leading-6 text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
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
          className={`mt-2 text-sm ${hasError ? "text-rose-600" : "text-muted"}`}
        >
          {controller.pending ? t("applications.workspace.actions.saving") : feedback?.text}
        </p>
      )}
    </section>
  );
}
