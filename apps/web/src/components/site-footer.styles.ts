import { tv } from "tailwind-variants";

export const siteFooterStyles = tv({
  slots: {
    root: "border-t border-line bg-surface px-6 py-5 text-center text-sm leading-6 text-muted",
    description: "",
  },
});
