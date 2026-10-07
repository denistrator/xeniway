import { tv } from "tailwind-variants";

export const preparationSectionStyles = tv({
  slots: {
    root: "",
    heading: "workspace-section-title font-display text-xl",
    help: "text-sm text-muted",
    content: "divide-y divide-line",
    field: "py-5 first:pt-0 last:pb-0",
    fieldHeading: "font-display text-lg text-ink",
  },
});
