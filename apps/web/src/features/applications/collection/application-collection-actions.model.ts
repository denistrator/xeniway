import type { ReactNode } from "react";
import { useCanMutate } from "../../offline/offline-access.view";

export type ApplicationCollectionActionsProps = {
  restoreLabel: ReactNode;
  deleteLabel?: ReactNode;
  onRestore: () => void;
  onDelete?: () => void;
  busy: boolean;
};

export function useApplicationCollectionActionsPresentation({ busy }: ApplicationCollectionActionsProps) {
  const canMutate = useCanMutate();

  return { disabled: busy || !canMutate };
}
