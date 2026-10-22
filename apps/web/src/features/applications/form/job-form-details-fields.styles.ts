import { tv } from "tailwind-variants";

export const jobFormDetailsFieldsStyles = tv({
  slots: {
    statusDate: "grid gap-4 sm:grid-cols-2",
    statusInput: "peer",
    statusOption: "",
    appliedDateInput: "peer",
    descriptionInput: "peer min-h-24",
    notesInput: "peer min-h-24",
    fieldError: "mt-1 text-sm leading-6 text-rose-600 dark:text-rose-400",
  },
});
