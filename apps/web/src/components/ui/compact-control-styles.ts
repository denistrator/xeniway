import { tv } from "tailwind-variants";

export const compactControlStyles = tv({
  base: "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-ink transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50",
});
