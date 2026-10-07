import { tv, type VariantProps } from "tailwind-variants";

export const buttonStyles = tv({
  slots: {
    root: "inline-flex gap-1 items-center justify-center rounded-xl text-sm font-semibold transition-[background-color,border-color,color,opacity,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50",
  },
  variants: {
    variant: {
      default: { root: "bg-ink text-canvas shadow-sm hover:bg-accent hover:shadow-md" },
      outline: { root: "border border-line bg-surface text-ink hover:border-line-hover hover:bg-surface-hover" },
      ghost: { root: "text-muted hover:bg-accent-hover hover:text-accent" },
    },
    size: {
      default: { root: "h-10 px-4 py-2" },
      sm: { root: "h-9 rounded-lg px-3" },
      icon: { root: "h-10 w-10" },
    },
  },
  defaultVariants: { variant: "default", size: "default" },
});

export function buttonVariants(options: VariantProps<typeof buttonStyles> & { className?: string } = {}) {
  return buttonStyles(options).root({ className: options.className });
}
