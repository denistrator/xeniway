export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface px-6 py-5 text-center text-sm leading-6 text-muted">
      <p>© {new Date().getFullYear()} Job Tracker · Built for focused job searches</p>
    </footer>
  );
}
