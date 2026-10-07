import { tv } from "tailwind-variants";

export const passwordResetStateStyles = tv({
  slots: {
    signInLink: "font-semibold text-ink underline-offset-4 hover:underline",
    requestLink: "font-semibold text-ink underline-offset-4 hover:underline",
  },
});
