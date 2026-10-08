import { tv } from "tailwind-variants";
import { fieldErrorStyles, fieldLabelStyles, textAreaStyles } from "../../../../components/ui/field-styles";
import { editorFormStyles } from "../../../../components/ui/surface-styles";

export const contactFormStyles = tv({
  slots: {
    root: editorFormStyles(),
    heading: "font-display text-lg text-ink",
    fields: "grid gap-4 sm:grid-cols-2",
    field: "",
    label: fieldLabelStyles(),
    input: "",
    notesField: "",
    notesLabel: fieldLabelStyles(),
    notes: textAreaStyles(),
  },
  variants: {
    profile: { true: { field: "sm:col-span-2" } },
    invalid: {
      true: { input: fieldErrorStyles({ invalid: true }), notes: textAreaStyles({ invalid: true }) },
    },
  },
});
