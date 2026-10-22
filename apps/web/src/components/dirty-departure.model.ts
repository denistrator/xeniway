import { useCallback, useEffect, useRef } from "react";
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
  const editorsRef = useRef(editors);
  const allowNextNavigation = useRef(false);
  editorsRef.current = editors;
  const shouldBlock = useCallback(() => {
    if (allowNextNavigation.current) {
      allowNextNavigation.current = false;
      return false;
    }

    return getActiveEditor(editorsRef.current) !== null;
  }, []);
  const blocker = useBlocker(shouldBlock);

  useEffect(() => {
    if (blocker.state === "blocked") {
      editor?.onDepartureBlocked?.();
    }
  }, [blocker.state, editor]);

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

  function captureProceed() {
    if (blocker.state !== "blocked") {
      return null;
    }

    allowNextNavigation.current = true;
    return blocker.proceed;
  }

  function discardAndProceed() {
    if (!editor) {
      return;
    }

    const proceed = captureProceed();
    if (!proceed) {
      editor.discard();
      return;
    }

    proceed();
    window.setTimeout(editor.discard, 0);
  }

  async function saveAndProceed() {
    if (!editor?.save) {
      return;
    }

    const proceed = captureProceed();
    const saved = await editor.save();
    if (saved) {
      proceed?.();
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
