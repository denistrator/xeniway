import { tv } from "tailwind-variants";

export const workspaceSectionUiStyles = tv({
  slots: {
    header: "flex flex-row flex-wrap items-start justify-between gap-3",
    title: "workspace-section-title font-display text-xl",
    status: "mt-3 text-sm",
    actions: "flex flex-wrap gap-2",
    error: "mt-1 text-sm text-rose-600",
  },
  variants: { error: { true: { status: "text-rose-600" }, false: { status: "text-muted" } } },
});
