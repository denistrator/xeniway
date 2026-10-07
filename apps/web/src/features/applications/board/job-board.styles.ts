import { tv } from "tailwind-variants";

export const jobBoardStyles = tv({
  slots: {
    root: "job-board-scroll w-full overflow-x-auto",
    columns: "grid grid-cols-1 gap-4 px-6 md:grid-flow-col md:grid-cols-[1fr_minmax(256px,1fr)]",
    emptyMessage: "px-6 pt-4 text-center text-sm text-muted",
  },
});
