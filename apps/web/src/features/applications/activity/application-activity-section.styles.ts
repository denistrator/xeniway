import { tv } from "tailwind-variants";
import { collectionActionStyles } from "../../../styles/shared/surface-styles";

export const applicationActivitySectionStyles = tv({
  slots: {
    root: "mt-6 border-t border-line pt-5 focus-visible:outline-2",
    header: "flex items-center justify-between gap-3",
    heading: "workspace-section-title font-display text-lg font-semibold text-ink",
    addButton: collectionActionStyles(),
    timeline: "mt-4",
    error: "text-sm text-rose-600",
  },
});
