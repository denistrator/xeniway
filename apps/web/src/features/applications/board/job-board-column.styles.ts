import { tv } from "tailwind-variants";
import { jobStatusStyles } from "./job-status-styles.ts";

export const jobBoardColumnStyles = tv({
  extend: jobStatusStyles,
  slots: {
    column: "",
    header: "mb-3 flex items-center justify-between px-1",
    heading: "text-sm font-bold uppercase tracking-[0.12em] text-ink",
    count: "rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold tabular-nums text-accent",
    list: "list-none space-y-3 p-0",
    emptyItem: "",
    emptyMessage: "rounded-xl border border-dashed border-line px-3 py-8 text-center text-sm leading-6 text-muted",
    dropItem: "",
    placeholder: "h-20 rounded-xl border-2 border-dashed border-accent bg-accent-soft",
  },
});
