import { tv } from "tailwind-variants";

export const optionMarkerStyles = tv({
  base: "pointer-events-none size-4 rounded-full border-3",
  variants: { selected: { true: "border-accent", false: "border-transparent" } },
});
export const applicationStatusControlStyles = tv({
  slots: {
    root: "workspace-inline-edit relative min-w-0 focus-visible:outline-2",
    trigger:
      "inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-sm font-semibold text-ink hover:bg-surface-hover focus-visible:outline-2",
    marker: "size-2 rounded-full",
    options: "absolute start-0 top-full z-20 mt-2 min-w-56 rounded-xl border border-line bg-surface p-2 shadow-lg",
    legend: "sr-only",
    option:
      "relative flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent-hover has-[:focus-visible]:outline-2",
    input: "absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed",
    optionMarker: "",
    feedback: "mt-2 text-sm text-rose-600 dark:text-rose-400",
  },
});
