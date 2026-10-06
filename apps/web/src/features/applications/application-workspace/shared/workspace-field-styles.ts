import { tv } from "tailwind-variants";

export const workspaceFieldStyles = tv({
  slots: {
    root: "workspace-inline-edit",
    heading: "",
    readView: "flex items-start justify-between gap-3",
    value: "whitespace-pre-wrap text-sm leading-6 text-muted",
    editLabel: "shrink-0 rounded-lg border border-line px-2 py-1 text-sm font-medium text-ink",
    feedback: "text-sm",
  },
  variants: { error: { true: { feedback: "text-rose-600" }, false: { feedback: "text-muted" } } },
  defaultVariants: { error: false },
});
