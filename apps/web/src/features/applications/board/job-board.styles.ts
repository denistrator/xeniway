import { tv } from "tailwind-variants";

export const jobBoardStyles = tv({
  slots: {
    root: "job-board-scroll w-full overflow-x-auto",
    statusNavigation: "mb-4 flex flex-wrap gap-2 px-6 md:hidden",
    statusLink:
      "rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold text-accent focus-visible:outline-2",
    columns: "grid grid-cols-1 gap-4 px-6 md:grid-flow-col md:grid-cols-[1fr_minmax(256px,1fr)]",
    operationError: "mx-6 mb-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
    operationSuccess: "mx-6 mb-4 text-sm text-muted",
    emptyMessage: "px-6 pt-4 text-center text-sm text-muted",
    emptyActions: "mt-3 flex justify-center gap-2",
    emptyAction:
      "rounded-lg px-3 py-2 font-semibold text-accent hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
  },
});
