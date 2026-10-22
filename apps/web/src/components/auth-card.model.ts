import type { ReactNode, RefObject } from "react";

export type AuthCardProps = {
  title: string;
  description: string;
  children: ReactNode;
  descriptionRef?: RefObject<HTMLParagraphElement | null>;
  announceDescription?: boolean;
};
