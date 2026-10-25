import { tv } from "tailwind-variants";

export const infoMessageStyles = tv({
  slots: {
    root: "relative rounded-lg border border-line bg-surface p-3 pe-12 text-sm text-muted",
    content: "min-w-0 wrap-anywhere",
    close:
      "absolute end-1 top-1 inline-flex min-h-8 min-w-8 items-center justify-center rounded text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-accent",
    closeIcon: "",
    timer: "pointer-events-none absolute size-6 -rotate-90 fill-none stroke-[1.5]",
    timerTrack: "stroke-line",
    timerArc:
      "stroke-accent motion-safe:transition-[stroke-dashoffset] motion-safe:duration-100 motion-safe:ease-linear",
  },
});
