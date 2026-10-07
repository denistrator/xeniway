import { forwardRef } from "react";
import { type ButtonProps, getButtonView } from "./button.ts";

export { buttonVariants } from "./button.styles";
export type { ButtonProps } from "./button.ts";

export const Button = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  const view = getButtonView(props);
  const Component = view.Component;
  return <Component className={view.className} ref={ref} {...view.props} />;
});
Button.displayName = "Button";
