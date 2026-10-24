import { tv } from "tailwind-variants";

export const welcomeModalContentStyles = tv({
  slots: {
    dialog:
      "relative max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto rounded-3xl border border-line bg-surface px-6 py-[min(1.5rem,5dvh)] shadow-2xl sm:px-8 sm:py-[min(2rem,5dvh)]",
    header: "flex items-center justify-between gap-4",
    closeButton:
      "inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted transition-colors hover:bg-accent-hover hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
    introduction: "mt-6",
    title: "wrap-anywhere font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl",
    description: "mt-4 text-base leading-7 text-muted",
    features: "mt-3 text-base leading-7 text-muted",
    actions: "mt-8 flex flex-wrap justify-end gap-3",
  },
});
