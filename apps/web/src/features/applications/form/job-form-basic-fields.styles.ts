import { tv } from "tailwind-variants";

export const jobFormBasicFieldsStyles = tv({
  slots: {
    companyPosition: "grid gap-4 sm:grid-cols-2",
    companyInput: "peer",
    positionInput: "peer",
    locationSalary: "grid gap-4 sm:grid-cols-2",
    locationInput: "peer",
    salaryInput: "peer",
    urlInput: "peer",
  },
});
