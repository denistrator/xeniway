import { tv } from "tailwind-variants";

export const homePageStyles = tv({
  slots: {
    empty: "rounded-2xl border border-dashed border-line p-12 text-center text-sm leading-6 text-muted",
    root: "space-y-6",
    content: "mx-auto max-w-7xl space-y-6 px-6",
    intro: "flex flex-wrap items-end justify-between gap-4",
    filters: "flex flex-wrap gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm",
    removeAllButton:
      "h-10 rounded-xl border border-line px-4 text-sm font-semibold text-ink hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
    loading: "py-8 text-center text-sm leading-6 text-muted",
    error: "rounded-xl bg-rose-50 p-4 text-sm leading-6 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
    errorActions: "mt-3 flex items-center gap-2",
  },
});
