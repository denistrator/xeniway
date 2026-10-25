import type { MouseEvent, RefObject } from "react";
import { useCanMutate } from "../../../offline/offline-access.view";

export type WorkspaceSectionHeaderProps = {
  headingId: string;
  title: string;
  actionLabel: string;
  actionRef: RefObject<HTMLButtonElement | null>;
  actionDisabled: boolean;
  onAction(trigger: HTMLButtonElement): void;
};

export type WorkspaceMutationStatusProps = {
  pending: boolean;
  pendingText: string;
  text: string | null;
  isError: boolean;
  returnFocusRef?: RefObject<HTMLElement | null>;
};

export type WorkspaceFormActionsProps = {
  pending: boolean;
  saveLabel: string;
  savingLabel: string;
  cancelLabel: string;
  onCancel(): void;
};

export type WorkspaceFieldErrorProps = { id: string; text: string };

export function createWorkspaceSectionAction(onAction: WorkspaceSectionHeaderProps["onAction"]) {
  return (event: MouseEvent<HTMLButtonElement>) => onAction(event.currentTarget);
}

export function useWorkspaceFormActions(pending: boolean) {
  const canMutate = useCanMutate();
  return { saveDisabled: !canMutate || pending, cancelDisabled: canMutate && pending };
}
