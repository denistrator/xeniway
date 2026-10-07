import { tv } from "tailwind-variants";

export const applicationActivityEventStyles = tv({
  slots: {
    root: "rounded-xl border border-line p-4",
    layout: "flex items-start justify-between gap-3",
    content: "",
    type: "text-xs font-semibold uppercase tracking-wide text-muted",
    title: "mt-1 font-medium text-ink break-words",
    statusChange: "mt-1 text-sm text-muted",
    description: "mt-2 whitespace-pre-wrap break-words text-sm text-ink",
    occurredAt: "mt-2 block text-xs text-muted",
    actions: "flex shrink-0 gap-2",
    editButton: "rounded px-2 py-1 text-sm text-accent hover:bg-surface-hover focus-visible:outline-2",
    deleteButton: "rounded px-2 py-1 text-sm text-rose-600 hover:bg-surface-hover focus-visible:outline-2",
  },
  variants: {
    system: {
      true: { root: "bg-surface-tint" },
      false: { root: "bg-surface" },
    },
  },
});
