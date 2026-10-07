import { tv } from "tailwind-variants";

export const statusFilterStyles = tv({
  slots: {
    root: "relative w-full sm:w-auto",
    trigger: "w-full sm:w-auto",
    selection: "ms-2 text-xs text-muted",
  },
});
