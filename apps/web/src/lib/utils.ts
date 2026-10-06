import { cn as mergeClasses } from "tailwind-variants";

// Keep the application's class-composition contract a definite string.
export function cn(...inputs: Parameters<typeof mergeClasses>): string {
  return mergeClasses(...inputs) ?? "";
}
