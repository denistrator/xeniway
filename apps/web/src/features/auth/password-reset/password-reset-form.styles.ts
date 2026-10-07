import { tv } from "tailwind-variants";

export const passwordResetFormStyles = tv({
  slots: {
    form: "space-y-4",
    passwordInput: "peer",
    confirmationInput: "peer",
    error: "text-sm leading-6 text-rose-600 dark:text-rose-400",
    submitButton: "w-full",
  },
});
