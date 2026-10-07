import type { InputHTMLAttributes } from "react";
import { inputStyles } from "./input.styles";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;
const styles = inputStyles();

export function getInputView({ className, type = "text", ...props }: InputProps) {
  return { className: styles.root({ className }), type, props };
}
