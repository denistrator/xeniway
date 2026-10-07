import { tv } from "tailwind-variants";

export const jobFormStyles = tv({
  slots: {
    root: "flex grow flex-col space-y-4",
    error: "text-sm text-rose-600 dark:text-rose-400",
  },
});
