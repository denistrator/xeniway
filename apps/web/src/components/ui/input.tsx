import { forwardRef } from "react";
import { getInputView, type InputProps } from "./input.ts";

export const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  const view = getInputView(props);
  return <input ref={ref} type={view.type} className={view.className} {...view.props} />;
});
Input.displayName = "Input";
