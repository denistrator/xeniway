import { Button } from "../../../../components/ui/button.view";
import { CardHeader, CardTitle } from "../../../../components/ui/card.view";
import {
  createWorkspaceSectionAction,
  useWorkspaceFormActions,
  type WorkspaceFieldErrorProps,
  type WorkspaceFormActionsProps,
  type WorkspaceMutationStatusProps,
  type WorkspaceSectionHeaderProps,
} from "./workspace-section-ui.model";
import { workspaceSectionUiStyles } from "./workspace-section-ui.styles";

const styles = workspaceSectionUiStyles();

export function WorkspaceSectionHeader({
  headingId,
  title,
  actionLabel,
  actionRef,
  actionDisabled,
  onAction,
}: WorkspaceSectionHeaderProps) {
  const handleAction = createWorkspaceSectionAction(onAction);
  return (
    <CardHeader className={styles.header()}>
      <CardTitle id={headingId} className={styles.title()}>
        {title}
      </CardTitle>
      <Button ref={actionRef} type="button" size="sm" disabled={actionDisabled} onClick={handleAction}>
        {actionLabel}
      </Button>
    </CardHeader>
  );
}

export function WorkspaceMutationStatus({ pending, pendingText, text, isError }: WorkspaceMutationStatusProps) {
  return (
    <p role={isError ? "alert" : undefined} aria-live="polite" className={styles.status({ error: isError })}>
      {pending ? pendingText : text}
    </p>
  );
}

export function WorkspaceFormActions({
  pending,
  saveLabel,
  savingLabel,
  cancelLabel,
  onCancel,
}: WorkspaceFormActionsProps) {
  const view = useWorkspaceFormActions(pending);
  return (
    <div className={styles.actions()}>
      <Button type="submit" size="sm" disabled={view.saveDisabled}>
        {pending ? savingLabel : saveLabel}
      </Button>
      <Button type="button" variant="outline" size="sm" disabled={view.cancelDisabled} onClick={onCancel}>
        {cancelLabel}
      </Button>
    </div>
  );
}

export function WorkspaceFieldError({ id, text }: WorkspaceFieldErrorProps) {
  return (
    <p id={id} role="alert" className={styles.error()}>
      {text}
    </p>
  );
}
