import type { ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import type { ApplicationFormState as FormState } from "./application-form.ts";

export type JobFormBasicFieldsProps = {
  form: FormState;
  update: (field: keyof FormState, value: string) => void;
};

export function useJobFormBasicFieldsPresentation({ update }: JobFormBasicFieldsProps) {
  const { t } = useTranslation();
  const companyLabel = t("applications.form.company");
  const changeCompany = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    update("company", event.target.value);
  const positionLabel = t("applications.form.position");
  const changePosition = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    update("position", event.target.value);
  const locationLabel = t("applications.form.location");
  const changeLocation = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    update("location", event.target.value);
  const salaryLabel = t("applications.form.salary");
  const changeSalary = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    update("salary", event.target.value);
  const jobUrlLabel = t("applications.form.jobUrl");
  const changeJobUrl = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    update("jobUrl", event.target.value);
  return {
    companyLabel,
    changeCompany,
    positionLabel,
    changePosition,
    locationLabel,
    changeLocation,
    salaryLabel,
    changeSalary,
    jobUrlLabel,
    changeJobUrl,
  };
}
