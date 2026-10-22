import { tv } from "tailwind-variants";

const retry = "ms-2 rounded px-2 py-1 text-accent underline focus-visible:outline-2 focus-visible:outline-accent";

export const preferenceFeedbackStyles = tv({
  slots: {
    root: "space-y-2 text-sm text-muted",
    accountMessage: "",
    storageMessage: "",
    dictionaryMessage: "",
    retryAccount: retry,
    retryStorage: retry,
    retryDictionary: retry,
    dismiss:
      "absolute end-1 top-1 inline-flex min-h-8 min-w-8 items-center justify-center rounded text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-accent",
    dismissIcon: "",
  },
  variants: {
    compact: {
      true: {
        root: "absolute end-0 top-full z-20 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-lg border border-line bg-surface p-3 pe-9 shadow-lg",
      },
    },
  },
});
