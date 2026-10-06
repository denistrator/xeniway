import * as React from "react";
import { tv } from "tailwind-variants";

const inputStyles = tv({
  base: "flex h-10 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink shadow-sm outline-none placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent-soft",
});

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "text", ...props }, ref) => (
    <input ref={ref} type={type} className={inputStyles({ className })} {...props} />
  ),
);
Input.displayName = "Input";

export { Input };
