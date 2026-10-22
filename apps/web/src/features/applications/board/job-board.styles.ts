import { tv } from "tailwind-variants";

export const jobBoardStyles = tv({
  slots: {
    root: "job-board-scroll w-full overflow-x-auto",
    columns: "grid grid-cols-1 gap-4 px-6 md:grid-flow-col md:grid-cols-[1fr_minmax(256px,1fr)]",
    operationError: "mx-6 mb-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
    emptyMessage: "px-6 pt-4 text-center text-sm text-muted",
  },
});
