/** Wrap focus at the ends of a dialog without intercepting ordinary Tab navigation. */
export function trapTabFocus(event: KeyboardEvent, container: Element): void {
  const focusable = container.querySelectorAll<HTMLElement>(
    "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex='-1'])",
  );
  if (!focusable.length) {
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
    return;
  }
  if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
