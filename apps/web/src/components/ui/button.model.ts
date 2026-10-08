import { Slot } from "@radix-ui/react-slot";
import type { ButtonHTMLAttributes } from "react";
import type { VariantProps } from "tailwind-variants";
import { buttonStyles } from "./button.styles";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonStyles> {
  asChild?: boolean;
}

export function getButtonView({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  return {
    Component: asChild ? Slot : "button",
    className: buttonStyles({ variant, size }).root({ className }),
    props,
  } as const;
}
