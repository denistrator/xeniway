import { tv } from "tailwind-variants";

export const aboutHeroStyles = tv({
  slots: {
    root: "rounded-3xl border border-line bg-surface p-6 shadow-sm sm:p-12",
    heading: "font-display max-w-4xl text-4xl font-bold tracking-tight text-ink sm:text-6xl",
    description: "mt-6 max-w-3xl text-lg leading-8 text-muted",
  },
});
