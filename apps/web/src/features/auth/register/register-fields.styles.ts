import { tv } from "tailwind-variants";

export const registerFieldsStyles = tv({
  slots: {
    nameFields: "grid gap-3 sm:grid-cols-2",
    firstNameInput: "peer",
    lastNameInput: "peer",
    emailInput: "peer",
    passwordInput: "peer",
    confirmationInput: "peer",
    passwordHelp: "mt-1 text-sm leading-6 text-muted",
    fieldError: "mt-1 text-sm leading-6 text-rose-600 dark:text-rose-400",
  },
});
