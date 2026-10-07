import { tv } from "tailwind-variants";

export const offlineControlsStyles = tv({
  slots: {
    root: "mx-auto w-full max-w-7xl px-6 pt-4 text-sm",
    notices: "space-y-2",
    readOnlyNotice: "",
    localLogoutNotice: "",
    updateNotice: "",
    readyNotice: "",
    failureNotice: "",
    progressNotice: "",
    settings: "mt-2 rounded-xl border border-line bg-surface p-3",
    summary: "cursor-pointer font-semibold focus-visible:outline-2",
    productionNotice: "my-3",
    privacyNotice: "my-3",
    coverageNotice: "my-3",
    refreshNotice: "my-3",
    refreshButton: "aria-disabled:opacity-50",
    consentLabel: "flex gap-2",
    consentInput: "",
    enableButton: "mt-3",
  },
});
