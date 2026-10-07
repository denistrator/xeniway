import { tv } from "tailwind-variants";

export const appStyles = tv({
  slots: {
    skipLink:
      "skip-link fixed start-4 top-4 z-[100] -translate-y-24 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-canvas shadow-lg transition-transform focus:translate-y-0",
  },
});
