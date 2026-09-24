import type { RefObject } from "react";
import { Button } from "../../../../components/ui/button";
import { CardHeader, CardTitle } from "../../../../components/ui/card";

export function WorkspaceSectionHeader({
  headingId,
  title,
  actionLabel,
  actionRef,
  actionDisabled,
  onAction,
}: {
  headingId: string;
  title: string;
  actionLabel: string;
  actionRef: RefObject<HTMLButtonElement | null>;
  actionDisabled: boolean;
  onAction(trigger: HTMLButtonElement): void;
}) {
  return (
    <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
      <CardTitle id={headingId} className="font-display text-xl">
        {title}
      </CardTitle>
      <Button
        ref={actionRef}
        type="button"
        size="sm"
        disabled={actionDisabled}
        onClick={(event) => onAction(event.currentTarget)}
      >
        {actionLabel}
      </Button>
    </CardHeader>
  );
}

export function WorkspaceMutationStatus({
  pending,
  pendingText,
  text,
  isError,
}: {
  pending: boolean;
  pendingText: string;
  text: string | null;
  isError: boolean;
}) {
  return (
    <p
      role={isError ? "alert" : undefined}
      aria-live="polite"
      className={`mt-3 text-sm ${isError ? "text-rose-600" : "text-muted"}`}
    >
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
}: {
  pending: boolean;
  saveLabel: string;
  savingLabel: string;
  cancelLabel: string;
  onCancel(): void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? savingLabel : saveLabel}
      </Button>
      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={onCancel}>
        {cancelLabel}
      </Button>
    </div>
  );
}

export function WorkspaceFieldError({ id, text }: { id: string; text: string }) {
  return (
    <p id={id} role="alert" className="mt-1 text-sm text-rose-600">
      {text}
    </p>
  );
}
