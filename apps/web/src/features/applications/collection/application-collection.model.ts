import type { ReactNode } from "react";
import { useCanMutate } from "../../offline/offline-access.view";

export type ApplicationCollectionProps = {
  title: string;
  description: string;
  loadingMessage: string;
  emptyMessage: string;
  noMatchMessage: string;
  errorMessage?: string;
  loading: boolean;
  isEmpty: boolean;
  hasResults: boolean;
  children: ReactNode;
  removeAllLabel: string;
  onRemoveAll: () => void;
};

export function useApplicationCollectionPresentation() {
  const canMutate = useCanMutate();

  return { canMutate };
}
