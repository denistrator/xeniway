import { tv } from "tailwind-variants";

export const registerFieldsStyles = tv({
  slots: {
    nameFields: "grid gap-3 sm:grid-cols-2",
    firstNameInput: "peer",
    lastNameInput: "peer",
    emailInput: "peer",
    passwordInput: "peer",
    confirmationInput: "peer",
  },
});
