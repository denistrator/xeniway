import { tv } from "tailwind-variants";
import { collectionActionStyles } from "../../../components/ui/surface-styles";

export const applicationActivityStyles = tv({
  slots: {
    root: "mt-6 border-t border-line pt-5",
    header: "flex items-center justify-between gap-3",
    heading: "font-display text-lg font-semibold text-ink",
    addButton: collectionActionStyles(),
    feedback: "mt-4",
    message: "text-sm text-muted",
    error: "text-sm text-rose-600",
    retryButton: "",
  },
});
