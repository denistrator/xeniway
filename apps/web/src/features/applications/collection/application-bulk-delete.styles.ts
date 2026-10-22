import { tv } from "tailwind-variants";

export const applicationBulkDeleteStyles = tv({
  slots: {
    root: "rounded-2xl border border-line p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
    disclosure: "space-y-3",
    summary:
      "cursor-pointer rounded text-sm font-semibold text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
    scope: "max-w-3xl text-sm leading-6 text-muted",
    deleteButton: "h-auto min-h-10 whitespace-normal text-start text-rose-700 dark:text-rose-300",
    success: "mt-3 text-sm leading-6 text-ink",
  },
});
