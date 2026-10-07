import { tv } from "tailwind-variants";

export const applicationActivityTimelineStyles = tv({
  slots: {
    empty: "text-sm text-muted",
    list: "space-y-3 max-h-screen overflow-y-auto",
    item: "",
  },
});
