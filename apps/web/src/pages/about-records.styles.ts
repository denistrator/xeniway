import { tv } from "tailwind-variants";

export const aboutRecordsStyles = tv({
  slots: {
    root: "",
    heading: "font-display text-3xl font-bold tracking-tight text-ink",
    description: "mt-3 max-w-3xl leading-7 text-muted",
    items: "mt-6 divide-y divide-line border-y border-line",
    item: "grid gap-2 py-5 sm:grid-cols-[minmax(10rem,0.6fr)_1.4fr] sm:gap-8",
    term: "font-semibold text-ink",
    detail: "max-w-3xl text-sm leading-7 text-muted",
  },
});
