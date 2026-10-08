import { tv } from "tailwind-variants";
import { emptyStateStyles } from "../../../styles/shared/surface-styles";

export const applicationCollectionStyles = tv({
  slots: {
    root: "mx-auto max-w-7xl space-y-6 px-6",
    toolbar: "flex flex-wrap gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm",
    removeAllButton:
      "h-10 rounded-xl border border-line px-4 text-sm font-semibold text-ink hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
    loading: "py-10 text-center text-sm leading-6 text-muted",
    error: "rounded-xl bg-rose-50 p-4 text-sm leading-6 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
    empty: emptyStateStyles({ page: true }),
    results: "grid gap-4 md:grid-cols-2 xl:grid-cols-3",
    noMatch: emptyStateStyles({ page: true }),
  },
});
