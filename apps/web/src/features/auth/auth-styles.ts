import { tv } from "tailwind-variants";

export const authStyles = tv({
  slots: {
    link: "font-semibold text-ink underline-offset-4 hover:underline",
    error: "text-sm leading-6 text-rose-600 dark:text-rose-400",
  },
});
export const { link: authLinkStyles, error: authErrorStyles } = authStyles();
