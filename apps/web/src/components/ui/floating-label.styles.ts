import { tv } from "tailwind-variants";

export const floatingLabelStyles = tv({
  slots: { root: "floating-label", icon: "floating-label-icon", label: "floating-label-label" },
  variants: { withIcon: { true: { root: "floating-label-with-icon" } } },
});
