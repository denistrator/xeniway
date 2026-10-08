import { tv } from "tailwind-variants";
import { emptyStateStyles } from "../../../../styles/shared/surface-styles";

export const contactsSectionStyles = tv({
  slots: {
    root: "focus-visible:outline-2",
    empty: emptyStateStyles(),
    list: "grid gap-3 md:grid-cols-2",
    contact: "rounded-xl border border-line bg-surface p-4",
    header: "flex flex-wrap items-start justify-between gap-3",
    identity: "",
    name: "font-display text-lg text-ink",
    role: "text-sm text-muted",
    actions: "flex gap-2",
    links: "mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-accent",
    email: "break-all underline underline-offset-2 focus-visible:outline-2",
    phone: "underline underline-offset-2 focus-visible:outline-2",
    profile: "underline underline-offset-2 focus-visible:outline-2",
    notes: "mt-3 whitespace-pre-wrap text-sm leading-6 text-muted",
  },
});
