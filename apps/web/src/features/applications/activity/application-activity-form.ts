import {
  type ApplicationEvent,
  type ApplicationEventInput,
  applicationEventInputSchema,
  manualApplicationEventTypeSchema,
} from "@xeniway/shared";
import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useCanMutate } from "../../offline/offline-access";
import { applicationActivityFormStyles } from "./application-activity-form.styles";

const styles = applicationActivityFormStyles();

function toLocalDateTime(value: string) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function useApplicationActivityForm(
  event: ApplicationEvent | undefined,
  onSubmit: (input: ApplicationEventInput) => Promise<void>,
  editorKey: string | null = "mounted",
) {
  const { t } = useTranslation();
  const canMutate = useCanMutate();
  const initialFocus = useRef<HTMLSelectElement>(null);
  const [type, setType] = useState<(typeof manualApplicationEventTypeSchema.options)[number]>(
    event?.isSystem ? "note" : ((event?.type as (typeof manualApplicationEventTypeSchema.options)[number]) ?? "note"),
  );
  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [occurredAt, setOccurredAt] = useState(toLocalDateTime(event?.occurredAt ?? new Date().toISOString()));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<"invalid" | "saveFailed" | null>(null);

  useEffect(() => {
    if (!editorKey) {
      return;
    }
    setType(event?.isSystem ? "note" : ((event?.type as typeof type) ?? "note"));
    setTitle(event?.title ?? "");
    setDescription(event?.description ?? "");
    setOccurredAt(toLocalDateTime(event?.occurredAt ?? new Date().toISOString()));
    setError(null);
    initialFocus.current?.focus();
  }, [editorKey, event]);

  const submit = async (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    if (!canMutate) {
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
    setPending(true);
    setError(null);
    try {
      await onSubmit(parsed.data);
    } catch {
      setError("saveFailed");
    } finally {
      setPending(false);
    }
  };

  function changeType(change: ChangeEvent<HTMLSelectElement>) {
    setType(change.target.value as typeof type);
  }

  function changeTitle(change: ChangeEvent<HTMLInputElement>) {
    setTitle(change.target.value);
  }

  function changeDescription(change: ChangeEvent<HTMLTextAreaElement>) {
    setDescription(change.target.value);
  }

  function changeOccurredAt(change: ChangeEvent<HTMLInputElement>) {
    setOccurredAt(change.target.value);
  }

  return {
    styles,
    fieldsReadOnly: !canMutate,
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
    submit,
  };
}
