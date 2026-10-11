import { tv } from "tailwind-variants";

export const aboutSecurityStyles = tv({
  slots: {
    root: "rounded-3xl border border-line bg-surface p-8 shadow-sm sm:p-10",
    content: "grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start",
    heading: "font-display text-3xl font-bold tracking-tight text-ink",
    description: "space-y-4 text-sm leading-7 text-muted",
    titleGroup: "",
    ownership: "",
    credentials: "",
    device: "",
    accessibility: "",
  },
});
