import { tv } from "tailwind-variants";
import { jobStatusStyles } from "./job-status-styles";

export const jobCardStyles = tv({
  extend: jobStatusStyles,
  slots: {
    root: "block w-full cursor-grab rounded-xl border border-line bg-surface p-4 text-start shadow-sm transition-[background-color,box-shadow,transform] hover:-translate-y-1 hover:bg-surface-hover hover:shadow-lg active:cursor-grabbing",
    header: "flex items-start justify-between gap-3",
    content: "min-w-0",
    companyRow: "flex items-start gap-2 break-words font-semibold text-ink",
    marker: "mt-1.5 size-2 shrink-0 rounded-full",
    company: "",
    position: "mt-1 break-words text-sm leading-6 text-muted",
    description: "mt-3 line-clamp-2 break-words text-sm leading-6 text-muted",
    metadata: "mt-3 flex flex-wrap gap-3 text-sm leading-6 text-muted",
    location: "break-words",
    appliedDate: "",
  },
});
