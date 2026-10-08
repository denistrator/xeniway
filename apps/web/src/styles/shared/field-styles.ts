import { tv } from "tailwind-variants";

// Shared field recipes composed by component styles; these helpers render no UI.
// Shared validation overrides for native inputs and textareas.
export const fieldErrorStyles = tv({
  variants: {
    invalid: { true: "border-rose-600 focus:border-rose-600 focus:ring-rose-200" },
  },
});

export const textAreaStyles = tv({
  base: "w-full rounded-xl border bg-surface px-3 py-2 text-sm text-ink outline-none focus:ring-2",
  variants: {
    invalid: {
      true: "border-rose-600 focus:border-rose-600 focus:ring-rose-200",
      false: "border-line focus:border-accent focus:ring-accent-soft",
    },
  },
  defaultVariants: { invalid: false },
});

export const fieldLabelStyles = tv({ base: "mb-1 block text-sm font-medium text-ink" });
