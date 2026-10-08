import { tv } from "tailwind-variants";
import { textAreaStyles } from "../../../../components/ui/field-styles";

export const workspaceTextFieldStyles = tv({
  slots: {
    readView: "flex items-start justify-between gap-3",
    value: "whitespace-pre-wrap text-sm leading-6 text-muted",
    editLabel: "shrink-0 rounded-lg border border-line px-2 py-1 text-sm font-medium text-ink",
    root: "workspace-inline-edit focus-visible:outline-2",
    heading: "",
    label: "sr-only",
    input: textAreaStyles({ className: "leading-6" }),
    offlineActions: "mt-2 flex gap-2",
    feedback: "mt-2 text-sm",
  },
  variants: { error: { true: { feedback: "text-rose-600" }, false: { feedback: "text-muted" } } },
});
