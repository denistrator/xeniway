import { tv } from "tailwind-variants";

export const applicationCompactFieldStyles = tv({
  slots: {
    readView: "break-words text-ink",
    label: "block font-medium text-muted",
    value: "block",
    root: "workspace-inline-edit min-w-0 text-sm focus-visible:outline-2",
    offlineActions: "mt-2 flex gap-2",
    feedback: "mt-1 text-sm",
  },
  variants: {
    showLabel: { true: { value: "mt-1" } },
    error: { true: { feedback: "text-rose-600" }, false: { feedback: "text-muted" } },
  },
});
