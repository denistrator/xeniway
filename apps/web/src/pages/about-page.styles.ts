import { tv } from "tailwind-variants";

export const aboutPageStyles = tv({
  slots: {
    root: "px-6 text-ink",
    content: "mx-auto flex max-w-6xl flex-col gap-10",
  },
});
