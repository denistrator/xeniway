import { tv } from "tailwind-variants";
export const themeSelectorStyles = tv({
  slots: {
    button:
      "inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-ink transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
  },
});
