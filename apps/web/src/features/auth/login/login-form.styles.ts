import { tv } from "tailwind-variants";

export const loginFormStyles = tv({
  slots: {
    form: "space-y-4",
    emailInput: "peer",
    passwordInput: "peer",
    error: "text-sm leading-6 text-rose-600 dark:text-rose-400",
    submitButton: "w-full",
    forgotPasswordPrompt: "text-center text-sm leading-6 text-muted",
    forgotPasswordLink: "font-semibold text-ink underline-offset-4 hover:underline",
  },
});
