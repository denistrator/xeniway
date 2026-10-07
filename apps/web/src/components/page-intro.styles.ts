import { tv } from "tailwind-variants";

export const pageIntroStyles = tv({
  slots: {
    heading: "font-display text-4xl font-bold tracking-tight text-ink",
    description: "mt-2 max-w-2xl leading-7 text-muted",
    root: "",
  },
});
