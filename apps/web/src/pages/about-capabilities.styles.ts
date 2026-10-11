import { tv } from "tailwind-variants";
export const aboutCapabilitiesStyles = tv({
  slots: {
    root: "",
    intro: "mb-5 max-w-2xl",
    heading: "font-display text-3xl font-bold tracking-tight text-ink",
    description: "mt-3 leading-7 text-muted",
    items: "grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-[1.15fr_0.85fr]",
    item: "border-t border-line pt-4",
    itemHeading: "font-semibold text-ink",
    itemDescription: "mt-2 text-sm leading-6 text-ink",
  },
});
