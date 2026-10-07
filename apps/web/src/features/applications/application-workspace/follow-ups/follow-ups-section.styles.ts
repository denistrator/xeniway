import { tv } from "tailwind-variants";
import { emptyStateStyles } from "../../../../components/ui/surface-styles.ts";
export const followUpStyles = tv({
  base: "flex flex-wrap items-start gap-4 rounded-xl border border-line p-4",
  variants: { completed: { true: "bg-surface-tint", false: "bg-surface" } },
});
export const followUpsSectionStyles = tv({
  slots: {
    root: "focus-visible:outline-2",
    empty: emptyStateStyles(),
    list: "space-y-3",
    task: "",
    date: "flex min-w-14 flex-col items-center rounded-lg border border-accent-warm/40 bg-surface-tint px-2 py-1 text-center text-ink",
    month: "text-[0.68rem] font-semibold uppercase tracking-wide text-muted",
    day: "font-display text-2xl leading-none",
    year: "text-[0.65rem] text-muted",
    content: "min-w-0 flex-1",
    header: "flex flex-wrap items-start justify-between gap-2",
    identity: "",
    title: "font-display text-lg text-ink",
    status: "text-xs font-semibold text-muted",
    actions: "flex flex-wrap gap-1",
    notes: "mt-2 whitespace-pre-wrap text-sm leading-6 text-muted",
    complete: "mt-3",
  },
});
