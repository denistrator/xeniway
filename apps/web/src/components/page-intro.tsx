export function PageIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">{eyebrow}</p>
      <h1 className="font-display mt-2 text-4xl font-bold tracking-tight text-ink">{title}</h1>
      <p className="mt-2 max-w-2xl leading-7 text-muted">{description}</p>
    </div>
  );
}
