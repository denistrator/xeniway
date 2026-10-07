import { tv } from "tailwind-variants";

export const statusFilterOptionsStyles = tv({
  slots: {
    root: "absolute start-0 top-full z-20 mt-2 w-full min-w-56 rounded-xl border border-line bg-surface p-2 shadow-lg sm:w-64",
    legend: "sr-only",
    selectAllLabel:
      "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-accent-hover",
    selectAllInput: "",
    separator: "my-1 border-t border-line",
    statusLabel: "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent-hover",
    statusInput: "",
  },
});
