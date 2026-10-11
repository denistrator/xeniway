import { tv } from "tailwind-variants";

export const aboutPageStyles = tv({
  slots: {
    root: "px-4 pb-8 text-ink sm:px-6",
    content: "mx-auto flex max-w-6xl flex-col gap-10 sm:gap-14",
  },
});
