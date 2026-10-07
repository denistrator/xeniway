import { tv } from "tailwind-variants";

const label = "block text-sm text-ink";
const field = "w-full rounded-lg border border-line bg-surface p-2 text-ink";

export const applicationActivityFormStyles = tv({
  slots: {
    root: "mt-4 space-y-3 rounded-xl border border-line bg-surface-tint p-4",
    typeLabel: label,
    typeSelect: field,
    typeOption: "",
    titleLabel: label,
    titleInput: field,
    descriptionLabel: label,
    descriptionInput: field,
    occurredAtLabel: label,
    occurredAtInput: field,
    error: "text-sm text-rose-600",
    actions: "flex justify-end gap-2",
    cancelButton: "rounded-lg border border-line px-3 py-2 text-sm text-ink focus-visible:outline-2",
    saveButton: "rounded-lg bg-accent px-3 py-2 text-sm text-white disabled:opacity-50 focus-visible:outline-2",
  },
});
