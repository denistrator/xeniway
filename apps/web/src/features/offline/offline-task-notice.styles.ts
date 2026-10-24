import { tv } from "tailwind-variants";

export const offlineTaskNoticeStyles = tv({
  slots: {
    root: "mx-auto mb-4 flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1 px-4 text-sm text-muted sm:px-6",
    message: "",
    settingsLink:
      "rounded text-accent underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-accent",
  },
});
