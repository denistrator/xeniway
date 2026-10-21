import {
  type ApplicationEvent,
  type ApplicationEventInput,
  applicationEventInputSchema,
  manualApplicationEventTypeSchema,
} from "@xeniway/shared";
import { type ChangeEvent, type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useCanMutate } from "../../offline/offline-access.model";
import { applicationActivityFormStyles } from "./application-activity-form.styles";

const styles = applicationActivityFormStyles();
type ActivityDraft = {
  type: (typeof manualApplicationEventTypeSchema.options)[number];
  title: string;
  description: string;
  occurredAt: string;
};
const activityDraftFields = [
  "type",
  "title",
  "description",
  "occurredAt",
] as const satisfies readonly (keyof ActivityDraft)[];

function toLocalDateTime(value: string) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function createActivityDraft(event: ApplicationEvent | undefined): ActivityDraft {
  return {
    type: event?.isSystem ? "note" : ((event?.type as ActivityDraft["type"]) ?? "note"),
    title: event?.title ?? "",
    description: event?.description ?? "",
    occurredAt: toLocalDateTime(event?.occurredAt ?? new Date().toISOString()),
  };
}

export function useApplicationActivityForm(
  event: ApplicationEvent | undefined,
  onSubmit: (input: ApplicationEventInput) => Promise<void>,
  onDirtyChange: (isDirty: boolean, focusedField: HTMLElement) => void,
  onSaveRequest: (save: () => void) => void,
  editorKey: string | null = "mounted",
) {
  const { t } = useTranslation();
  const canMutate = useCanMutate();
  const initialFocus = useRef<HTMLSelectElement>(null);
  const initialDraft = createActivityDraft(event);
  const [type, setType] = useState<ActivityDraft["type"]>(initialDraft.type);
  const [title, setTitle] = useState(initialDraft.title);
  const [description, setDescription] = useState(initialDraft.description);
  const [occurredAt, setOccurredAt] = useState(initialDraft.occurredAt);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<"invalid" | "saveFailed" | null>(null);
  const savingRef = useRef(false);

  useEffect(() => {
    if (!editorKey) {
      return;
    }
    const nextDraft = createActivityDraft(event);
    setType(nextDraft.type);
    setTitle(nextDraft.title);
    setDescription(nextDraft.description);
    setOccurredAt(nextDraft.occurredAt);
    setError(null);
    initialFocus.current?.focus();
  }, [editorKey, event]);

  const submit = useCallback(async () => {
    if (!canMutate || savingRef.current) {
      return;
    }
    const parsed = applicationEventInputSchema.safeParse({
      type,
      title,
      description: description || null,
      occurredAt: new Date(occurredAt).toISOString(),
    });
    if (!parsed.success) {
      setError("invalid");
      return;
    }
    savingRef.current = true;
    setPending(true);
    setError(null);
    try {
      await onSubmit(parsed.data);
    } catch {
      setError("saveFailed");
    } finally {
      savingRef.current = false;
      setPending(false);
    }
  }, [canMutate, description, occurredAt, onSubmit, title, type]);

  useEffect(() => onSaveRequest(() => void submit()), [onSaveRequest, submit]);

  function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    void submit();
  }

  function changeType(change: ChangeEvent<HTMLSelectElement>) {
    const nextType = change.target.value as typeof type;
    setType(nextType);
    reportDirty({ type: nextType, title, description, occurredAt }, change.currentTarget);
  }

  function changeTitle(change: ChangeEvent<HTMLInputElement>) {
    const nextTitle = change.target.value;
    setTitle(nextTitle);
    reportDirty({ type, title: nextTitle, description, occurredAt }, change.currentTarget);
  }

  function changeDescription(change: ChangeEvent<HTMLTextAreaElement>) {
    const nextDescription = change.target.value;
    setDescription(nextDescription);
    reportDirty({ type, title, description: nextDescription, occurredAt }, change.currentTarget);
  }

  function changeOccurredAt(change: ChangeEvent<HTMLInputElement>) {
    const nextOccurredAt = change.target.value;
    setOccurredAt(nextOccurredAt);
    reportDirty({ type, title, description, occurredAt: nextOccurredAt }, change.currentTarget);
  }

  function reportDirty(nextDraft: ActivityDraft, focusedField: HTMLElement) {
    const initial = createActivityDraft(event);
    const isDirty = activityDraftFields.some((field) => nextDraft[field] !== initial[field]);
    onDirtyChange(isDirty, focusedField);
  }

  return {
    styles,
    fieldsReadOnly: !canMutate || pending,
    saveDisabled: !canMutate || pending,
    typeOptions: manualApplicationEventTypeSchema.options.map((value) => ({
      value,
      label: t(`applications.activity.types.${value}`),
    })),
    typeLabel: t("applications.activity.type"),
    titleLabel: t("applications.activity.title"),
    descriptionLabel: t("applications.activity.description"),
    occurredAtLabel: t("applications.activity.occurredAt"),
    errorLabel: error ? t(`applications.activity.${error}`) : null,
    cancelLabel: t("applications.activity.cancel"),
    saveLabel: t(pending ? "applications.activity.saving" : "applications.activity.save"),
    changeType,
    changeTitle,
    changeDescription,
    changeOccurredAt,
    initialFocus,
    type,
    setType,
    title,
    setTitle,
    description,
    setDescription,
    occurredAt,
    setOccurredAt,
    pending,
    error,
    handleSubmit,
    submit,
  };
}
