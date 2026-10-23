import { tv } from "tailwind-variants";

export const offlineControlsStyles = tv({
  slots: {
    root: "space-y-3 rounded-xl border border-line bg-surface p-4 text-sm sm:p-6",
    heading: "flex items-center gap-2 font-display text-xl font-semibold text-ink",
    connectionIcon: "shrink-0 text-muted",
    loginLink:
      "inline-block rounded-lg text-accent underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-accent",
    notices: "space-y-2",
    readOnlyNotice: "",
    localLogoutNotice: "",
    updateNotice: "",
    readyNotice: "",
    failureNotice: "",
    restorationNotice: "",
    progressNotice: "",
    cleanupNotice: "",
    settings: "space-y-3",
    productionNotice: "my-3",
    privacyNotice: "my-3",
    coverageNotice: "my-3",
    refreshNotice: "my-3",
    refreshButton: "aria-disabled:opacity-50",
    downloadActions: "flex gap-2",
    cleanupActions: "flex flex-wrap items-center gap-2",
    retryCleanupButton: "",
    connectionActions: "flex gap-2 items-center",
    consentLabel: "flex gap-2",
    consentInput: "",
    enableButton: "mt-3",
  },
});
