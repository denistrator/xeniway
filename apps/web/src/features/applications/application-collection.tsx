import type { ReactNode } from "react";
import { ApplicationSearch } from "../../components/application-search";
import { PageIntro } from "../../components/page-intro";

export function ApplicationCollection({
  title,
  description,
  loadingMessage,
  emptyMessage,
  noMatchMessage,
  errorMessage,
  loading,
  isEmpty,
  hasResults,
  children,
}: {
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
}) {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6">
      <PageIntro title={title} description={description} />
      <div className="flex flex-wrap gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm">
        <ApplicationSearch />
      </div>
      {loading && (
        <p role="status" aria-live="polite" className="py-10 text-center text-sm leading-6 text-muted">
          {loadingMessage}
        </p>
      )}
      {errorMessage && (
        <p
          role="alert"
          className="rounded-xl bg-rose-50 p-4 text-sm leading-6 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
        >
          {errorMessage}
        </p>
      )}
      {isEmpty && (
        <p className="rounded-2xl border border-dashed border-line p-12 text-center text-sm leading-6 text-muted">
          {emptyMessage}
        </p>
      )}
      {hasResults && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>}
      {!loading && !isEmpty && !hasResults && (
        <p className="rounded-2xl border border-dashed border-line p-12 text-center text-sm leading-6 text-muted">
          {noMatchMessage}
        </p>
      )}
    </div>
  );
}
