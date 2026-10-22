import type { ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import type { ApplicationFormErrors, ApplicationFormState as FormState } from "./application-form";

export type JobFormBasicFieldsProps = {
  form: FormState;
  errors: ApplicationFormErrors;
  update: (field: keyof FormState, value: string) => void;
};

function getFieldError(field: keyof FormState, errors: ApplicationFormErrors) {
  const error = errors[field];
  const errorId = error ? `job-${field}-error` : undefined;

  return { error, errorId };
}

export function useJobFormBasicFieldsPresentation({ errors, update }: JobFormBasicFieldsProps) {
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
    errors: {
      company: getFieldError("company", errors),
      position: getFieldError("position", errors),
      location: getFieldError("location", errors),
      salary: getFieldError("salary", errors),
      jobUrl: getFieldError("jobUrl", errors),
    },
  };
}
