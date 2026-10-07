import { tv } from "tailwind-variants";

export const applicationWorkspacePageStyles = tv({
  slots: {
    offline: "mx-auto max-w-7xl px-6",
    error: "mx-auto max-w-7xl px-6 py-8 text-sm text-rose-600",
    errorText: "",
    retry: "mt-2 underline focus-visible:outline-2",
  },
});
