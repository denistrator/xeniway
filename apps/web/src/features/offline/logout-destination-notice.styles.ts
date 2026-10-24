import { tv } from "tailwind-variants";

export const logoutDestinationNoticeStyles = tv({
  slots: {
    root: "mb-5 space-y-3 rounded-xl border border-line bg-canvas p-4 text-sm text-ink",
    heading: "font-semibold",
    status: "space-y-2",
    description: "leading-6",
    persistenceWarning: "leading-6",
    failure: "leading-6 text-danger",
    finishButton: "w-full whitespace-normal",
  },
});
