import { tv } from "tailwind-variants";

export const forgotPasswordPageStyles = tv({
  slots: {
    success: "space-y-4",
    successMessage: "text-sm leading-6 text-muted",
    returnLink: "font-semibold text-ink underline-offset-4 hover:underline",
    form: "space-y-4",
    emailInput: "peer",
    error: "text-sm leading-6 text-rose-600 dark:text-rose-400",
    submitButton: "w-full",
    signInPrompt: "text-center text-sm leading-6 text-muted",
    signInLink: "font-semibold text-ink underline-offset-4 hover:underline",
  },
});
