import { Banknote, BriefcaseBusiness, Building2, Link, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FloatingLabel } from "../../components/ui/floating-label";
import { Input } from "../../components/ui/input";
import type { ApplicationFormState as FormState } from "./application-form";

export function JobFormBasicFields({
  form,
  update,
}: {
  form: FormState;
  update: (field: keyof FormState, value: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <FloatingLabel htmlFor="job-company" label={t("applications.form.company")} icon={Building2}>
          <Input
            id="job-company"
            className="peer"
            name="company"
            placeholder=" "
            required
            value={form.company}
            onChange={(event) => update("company", event.target.value)}
          />
        </FloatingLabel>
        <FloatingLabel htmlFor="job-position" label={t("applications.form.position")} icon={BriefcaseBusiness}>
          <Input
            id="job-position"
            className="peer"
            name="position"
            placeholder=" "
            required
            value={form.position}
            onChange={(event) => update("position", event.target.value)}
          />
        </FloatingLabel>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FloatingLabel htmlFor="job-location" label={t("applications.form.location")} icon={MapPin}>
          <Input
            id="job-location"
            className="peer"
            name="location"
            placeholder=" "
            value={form.location}
            onChange={(event) => update("location", event.target.value)}
          />
        </FloatingLabel>
        <FloatingLabel htmlFor="job-salary" label={t("applications.form.salary")} icon={Banknote}>
          <Input
            id="job-salary"
            className="peer"
            name="salary"
            placeholder=" "
            value={form.salary}
            onChange={(event) => update("salary", event.target.value)}
          />
        </FloatingLabel>
      </div>
      <FloatingLabel htmlFor="job-url" label={t("applications.form.jobUrl")} icon={Link}>
        <Input
          id="job-url"
          className="peer"
          name="jobUrl"
          placeholder=" "
          type="url"
          value={form.jobUrl}
          onChange={(event) => update("jobUrl", event.target.value)}
        />
      </FloatingLabel>
    </>
  );
}
