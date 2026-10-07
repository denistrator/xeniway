import { tv } from "tailwind-variants";

export const applicationLifecycleActionsStyles = tv({
  slots: {
    root: "flex flex-wrap gap-2 lg:justify-self-end focus-visible:outline-2",
    restoreError: "text-sm text-rose-600",
    actionError:
      "fixed inset-x-4 bottom-4 z-[80] mx-auto max-w-md rounded-xl bg-surface p-4 text-sm text-rose-600 shadow-lg",
  },
});
