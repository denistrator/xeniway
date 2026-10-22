import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useBlocker } from "react-router-dom";
import { useDirtyEditors } from "../lib/dirty-editors";

function getActiveEditor(editors: ReturnType<typeof useDirtyEditors>) {
  return editors.find((editor) => editor.dirty || editor.pending) ?? null;
}

export function useDirtyDeparture() {
  const { t } = useTranslation();
  const editors = useDirtyEditors();
  const editor = getActiveEditor(editors);
  const blocker = useBlocker(editor !== null);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [editor]);

  function keepEditing() {
    if (blocker.state === "blocked") {
      blocker.reset();
    }
  }

  function discardAndProceed() {
    if (!editor) {
      return;
    }

    if (blocker.state === "blocked") {
      editor.discard();
      blocker.proceed();
    }
  }

  async function saveAndProceed() {
    if (!editor?.save) {
      return;
    }

    const saved = await editor.save();
    if (saved && blocker.state === "blocked") {
      blocker.proceed();
    }
  }

  const isBlocked = blocker.state === "blocked";
  const pending = editor?.pending ?? false;
  const title = t("applications.workspace.unsavedChangesTitle");
  const text = t("applications.workspace.unsavedRecordChangesText");
  const saveLabel = t("applications.workspace.actions.saveChanges");
  const discardLabel = t("applications.workspace.actions.discardChanges");
  const keepEditingLabel = t("applications.workspace.actions.keepEditing");

  return {
    isBlocked,
    pending,
    canSave: Boolean(editor?.save),
    title,
    text,
    saveLabel,
    discardLabel,
    keepEditingLabel,
    keepEditing,
    discardAndProceed,
    saveAndProceed,
  };
}
