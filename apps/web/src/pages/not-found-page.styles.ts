import { tv } from "tailwind-variants";

export const notFoundPageStyles = tv({
  slots: {
    root: "px-6 text-ink",
    content:
      "mx-auto flex max-w-2xl flex-col items-center rounded-3xl border border-line bg-surface p-8 text-center shadow-sm sm:p-12",
    heading: "font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl",
    description: "mt-5 max-w-xl text-base leading-7 text-muted sm:text-lg",
    navigation: "mt-8 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row",
  },
});
