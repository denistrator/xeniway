import { tv } from "tailwind-variants";

export const inputStyles = tv({
  slots: {
    root: "flex h-10 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink shadow-sm outline-none placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent-soft",
  },
});
