import { tv } from "tailwind-variants";

export const cardStyles = tv({
  slots: {
    root: "rounded-2xl border border-line bg-surface shadow-sm",
    header: "space-y-1.5 p-6",
    title: "text-lg font-semibold text-ink",
    description: "text-sm text-muted",
    content: "p-6 pt-0",
  },
});
