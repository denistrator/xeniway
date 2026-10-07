import { tv } from "tailwind-variants";

export const jobFormHeaderStyles = tv({
  slots: {
    root: "mb-6 flex items-center justify-between gap-4",
    title: "font-display text-2xl font-bold tracking-tight text-ink",
    actions: "flex items-center gap-1",
  },
});
