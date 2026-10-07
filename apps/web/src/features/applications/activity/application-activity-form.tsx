import { type ApplicationEvent, type ApplicationEventInput, manualApplicationEventTypeSchema } from "@xeniway/shared";
import { useTranslation } from "react-i18next";
import { tv } from "tailwind-variants";
import { useCanMutate } from "../../offline/offline-access";
import { useApplicationActivityForm } from "./use-application-activity-form";

const activityFormStyles = tv({
  slots: {
    root: "mt-4 space-y-3 rounded-xl border border-line bg-surface-tint p-4",
    label: "block text-sm text-ink",
    field: "w-full rounded-lg border border-line bg-surface p-2 text-ink",
  },
});
const styles = activityFormStyles();

export function ApplicationActivityForm({
  event,
  onSubmit,
  onCancel,
}: {
  event?: ApplicationEvent;
  onSubmit: (input: ApplicationEventInput) => Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const canMutate = useCanMutate();
  const form = useApplicationActivityForm(event, onSubmit);
  return (
    <form
      className={styles.root()}
      onSubmit={(event) => {
        if (canMutate) {
          void form.submit(event);
        } else {
          event.preventDefault();
        }
      }}
    >
      <label className={styles.label()} htmlFor="activity-type">
        {t("applications.activity.type")}
      </label>
      <select
        ref={form.initialFocus}
        id="activity-type"
        name="type"
        disabled={!canMutate}
        className={styles.field()}
        value={form.type}
        onChange={(event) => form.setType(event.target.value as typeof form.type)}
      >
        {manualApplicationEventTypeSchema.options.map((type) => (
          <option key={type} value={type}>
            {t(`applications.activity.types.${type}`)}
          </option>
        ))}
      </select>
      <label className={styles.label()} htmlFor="activity-title">
        {t("applications.activity.title")}
      </label>
      <input
        id="activity-title"
        name="title"
        readOnly={!canMutate}
        className={styles.field()}
        required
        maxLength={255}
        value={form.title}
        onChange={(event) => form.setTitle(event.target.value)}
      />
      <label className={styles.label()} htmlFor="activity-description">
        {t("applications.activity.description")}
      </label>
      <textarea
        id="activity-description"
        name="description"
        readOnly={!canMutate}
        className={styles.field()}
        maxLength={10000}
        value={form.description}
        onChange={(event) => form.setDescription(event.target.value)}
      />
      <label className={styles.label()} htmlFor="activity-occurred-at">
        {t("applications.activity.occurredAt")}
      </label>
      <input
        id="activity-occurred-at"
        name="occurredAt"
        readOnly={!canMutate}
        type="datetime-local"
        className={styles.field()}
        required
        value={form.occurredAt}
        onChange={(event) => form.setOccurredAt(event.target.value)}
      />
      {form.error && (
        <p role="alert" className="text-sm text-rose-600">
          {t(`applications.activity.${form.error}`)}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="rounded-lg border border-line px-3 py-2 text-sm text-ink focus-visible:outline-2"
          onClick={onCancel}
        >
          {t("applications.activity.cancel")}
        </button>
        <button
          type="submit"
          disabled={!canMutate || form.pending}
          className="rounded-lg bg-accent px-3 py-2 text-sm text-white disabled:opacity-50 focus-visible:outline-2"
        >
          {t(form.pending ? "applications.activity.saving" : "applications.activity.save")}
        </button>
      </div>
    </form>
  );
}
