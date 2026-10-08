import { tv } from "tailwind-variants";
import { fieldLabelStyles, textAreaStyles } from "../../../../styles/shared/field-styles";
import { editorFormStyles } from "../../../../styles/shared/surface-styles";

export const followUpFormStyles = tv({
  slots: {
    root: editorFormStyles(),
    heading: "font-display text-lg text-ink",
    fields: "grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]",
    titleField: "",
    titleLabel: fieldLabelStyles(),
    titleInput: "",
    dateField: "",
    dateLabel: fieldLabelStyles(),
    dateInput: "",
    notesField: "",
    notesLabel: fieldLabelStyles(),
    notes: textAreaStyles(),
  },
});
