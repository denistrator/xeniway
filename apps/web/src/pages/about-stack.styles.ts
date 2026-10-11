import { tv } from "tailwind-variants";
export const aboutStackStyles = tv({
  slots: {
    block: "rounded-2xl border border-line bg-surface p-6 sm:p-8",
    blockHeading: "font-display text-2xl font-bold tracking-tight text-ink",
    blockDescription: "mt-2 text-sm leading-6 text-muted",
    definitions: "mt-6 divide-y divide-line",
    definition: "grid gap-1 py-4 first:pt-0 last:pb-0 sm:grid-cols-[minmax(9rem,0.7fr)_1.3fr] sm:gap-4",
    term: "flex items-center gap-2 font-semibold text-ink",
    icon: "shrink-0 text-accent",
    link: "underline decoration-accent/60 underline-offset-4 hover:decoration-accent",
    detail: "break-words text-sm leading-6 text-muted",
    root: "space-y-5 border-t border-line pt-6",
    summary:
      "cursor-pointer rounded-lg font-display text-2xl font-bold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
    description: "mt-3 leading-7 text-muted",
    blocks: "grid gap-5 lg:grid-cols-2",
  },
});
