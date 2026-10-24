import { tv } from "tailwind-variants";
export const applicationSearchStyles = tv({
  slots: {
    label: "min-w-0 flex-1 basis-full sm:basis-64",
    clearButton: "absolute end-1 top-1/2 size-8 -translate-y-1/2",
    clearText: "sr-only",
    input: "peer",
  },
  variants: { populated: { true: { input: "pe-10" } } },
});
