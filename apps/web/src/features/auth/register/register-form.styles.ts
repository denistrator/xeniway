import { tv } from "tailwind-variants";

export const registerFormStyles = tv({
  slots: {
    form: "space-y-4",
    error: "text-sm leading-6 text-rose-600 dark:text-rose-400",
    submitButton: "w-full",
  },
});
