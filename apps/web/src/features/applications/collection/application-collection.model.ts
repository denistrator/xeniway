import type { ReactNode } from "react";

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
  actions: ReactNode;
};
