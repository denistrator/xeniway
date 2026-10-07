import { tv } from "tailwind-variants";
import { collectionActionStyles } from "../../../components/ui/surface-styles.ts";

export const applicationCollectionCardStyles = tv({
  slots: {
    content: "space-y-4 p-5",
    summary: "min-w-0",
    company: "break-words font-semibold text-ink",
    position: "break-words text-sm leading-6 text-muted",
    location: "mt-1 break-words text-sm leading-6 text-muted",
    status: "mt-2 text-sm leading-6 text-muted",
    workspaceLink:
      "mt-2 inline-flex rounded-lg text-sm font-semibold text-accent underline-offset-4 hover:underline focus-visible:outline-2",
    activityButton: collectionActionStyles(),
    activityContent: "",
  },
});
