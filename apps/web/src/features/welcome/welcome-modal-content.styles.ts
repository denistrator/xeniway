import { tv } from "tailwind-variants";

export const welcomeModalContentStyles = tv({
  slots: {
    dialog: "relative w-full max-w-xl rounded-3xl border border-line bg-surface p-6 shadow-2xl sm:p-8",
    header: "flex items-center justify-between gap-4",
    closeButton:
      "inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted transition-colors hover:bg-accent-hover hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
    introduction: "mt-6",
    title: "font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl",
    description: "mt-4 text-base leading-7 text-muted",
    features: "mt-3 text-base leading-7 text-muted",
    actions: "mt-8 flex flex-wrap justify-end gap-3",
  },
});
