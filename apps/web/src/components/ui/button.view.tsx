import { forwardRef } from "react";
import { type ButtonProps, getButtonView } from "./button.model";

export type { ButtonProps } from "./button.model";
export { buttonVariants } from "./button.styles";

export const Button = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  const view = getButtonView(props);
  const Component = view.Component;
  return <Component className={view.className} ref={ref} {...view.props} />;
});
Button.displayName = "Button";
