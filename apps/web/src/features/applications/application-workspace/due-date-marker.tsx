import { useTranslation } from "react-i18next";

export function DueDateMarker({ dueDate }: { dueDate: string }) {
  const { i18n } = useTranslation();
  const date = new Date(`${dueDate}T00:00:00Z`);
  const month = new Intl.DateTimeFormat(i18n.language, { month: "short", timeZone: "UTC" }).format(date);
  const fullDate = new Intl.DateTimeFormat(i18n.language, { dateStyle: "long", timeZone: "UTC" }).format(date);
  return (
    <time
      dateTime={dueDate}
      title={fullDate}
      className="flex min-w-14 flex-col items-center rounded-lg border border-accent-warm/40 bg-surface-tint px-2 py-1 text-center text-ink"
    >
      <span className="text-[0.68rem] font-semibold uppercase tracking-wide text-muted">{month}</span>
      <span className="font-display text-2xl leading-none">{date.getUTCDate()}</span>
      <span className="text-[0.65rem] text-muted">{date.getUTCFullYear()}</span>
    </time>
  );
}
