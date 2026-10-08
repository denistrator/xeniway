import type { ComponentPropsWithRef } from "react";
import { cardStyles } from "./card.styles";

const { root, header, title, description, content } = cardStyles();

export function Card({ className, ...props }: ComponentPropsWithRef<"div">) {
  return <div {...props} className={root({ className })} />;
}

export function CardHeader({ className, ...props }: ComponentPropsWithRef<"div">) {
  return <div {...props} className={header({ className })} />;
}

export function CardTitle({ className, ...props }: ComponentPropsWithRef<"h2">) {
  return <h2 {...props} className={title({ className })} />;
}

export function CardDescription({ className, ...props }: ComponentPropsWithRef<"p">) {
  return <p {...props} className={description({ className })} />;
}

export function CardContent({ className, ...props }: ComponentPropsWithRef<"div">) {
  return <div {...props} className={content({ className })} />;
}
