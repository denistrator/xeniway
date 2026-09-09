export function PageIntro({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h1 className="font-display text-4xl font-bold tracking-tight text-ink">{title}</h1>
      <p className="mt-2 max-w-2xl leading-7 text-muted">{description}</p>
    </div>
  );
}
