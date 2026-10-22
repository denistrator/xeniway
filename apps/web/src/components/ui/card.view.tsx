import type { ComponentPropsWithRef } from "react";
import { cardStyles } from "./card.styles";

const { root, header, title, description, content } = cardStyles();

export function Card({ className, ...props }: ComponentPropsWithRef<"div">) {
  return <div {...props} className={root({ className })} />;
}

export function CardHeader({ className, ...props }: ComponentPropsWithRef<"div">) {
  return <div {...props} className={header({ className })} />;
}

export type CardTitleProps = ComponentPropsWithRef<"h2"> & { as?: "h1" | "h2" };

export function CardTitle({ as: Heading = "h2", className, ...props }: CardTitleProps) {
  return <Heading {...props} className={title({ className })} />;
}

export function CardDescription({ className, ...props }: ComponentPropsWithRef<"p">) {
  return <p {...props} className={description({ className })} />;
}

export function CardContent({ className, ...props }: ComponentPropsWithRef<"div">) {
  return <div {...props} className={content({ className })} />;
}
