import { Banknote, BriefcaseBusiness, Building2, Link, MapPin } from "lucide-react";
import { FloatingLabel } from "../../../components/ui/floating-label.view";
import { Input } from "../../../components/ui/input.view";
import { type JobFormBasicFieldsProps, useJobFormBasicFieldsPresentation } from "./job-form-basic-fields.model";
import { jobFormBasicFieldsStyles } from "./job-form-basic-fields.styles";

const styles = jobFormBasicFieldsStyles();

export function JobFormBasicFields({ form, errors, update }: JobFormBasicFieldsProps) {
  const {
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
    errors: fieldErrors,
  } = useJobFormBasicFieldsPresentation({ form, errors, update });

  return (
    <>
      <div className={styles.companyPosition()}>
        <FloatingLabel htmlFor="job-company" label={companyLabel} icon={Building2}>
          <Input
            id="job-company"
            className={styles.companyInput()}
            name="company"
            placeholder=" "
            required
            value={form.company}
            aria-invalid={fieldErrors.company.error ? true : undefined}
            aria-describedby={fieldErrors.company.errorId}
            onChange={changeCompany}
          />
          {fieldErrors.company.error && (
            <p id={fieldErrors.company.errorId} role="alert" className={styles.fieldError()}>
              {fieldErrors.company.error}
            </p>
          )}
        </FloatingLabel>
        <FloatingLabel htmlFor="job-position" label={positionLabel} icon={BriefcaseBusiness}>
          <Input
            id="job-position"
            className={styles.positionInput()}
            name="position"
            placeholder=" "
            required
            value={form.position}
            aria-invalid={fieldErrors.position.error ? true : undefined}
            aria-describedby={fieldErrors.position.errorId}
            onChange={changePosition}
          />
          {fieldErrors.position.error && (
            <p id={fieldErrors.position.errorId} role="alert" className={styles.fieldError()}>
              {fieldErrors.position.error}
            </p>
          )}
        </FloatingLabel>
      </div>
      <div className={styles.locationSalary()}>
        <FloatingLabel htmlFor="job-location" label={locationLabel} icon={MapPin}>
          <Input
            id="job-location"
            className={styles.locationInput()}
            name="location"
            placeholder=" "
            value={form.location}
            aria-invalid={fieldErrors.location.error ? true : undefined}
            aria-describedby={fieldErrors.location.errorId}
            onChange={changeLocation}
          />
          {fieldErrors.location.error && (
            <p id={fieldErrors.location.errorId} role="alert" className={styles.fieldError()}>
              {fieldErrors.location.error}
            </p>
          )}
        </FloatingLabel>
        <FloatingLabel htmlFor="job-salary" label={salaryLabel} icon={Banknote}>
          <Input
            id="job-salary"
            className={styles.salaryInput()}
            name="salary"
            placeholder=" "
            value={form.salary}
            aria-invalid={fieldErrors.salary.error ? true : undefined}
            aria-describedby={fieldErrors.salary.errorId}
            onChange={changeSalary}
          />
          {fieldErrors.salary.error && (
            <p id={fieldErrors.salary.errorId} role="alert" className={styles.fieldError()}>
              {fieldErrors.salary.error}
            </p>
          )}
        </FloatingLabel>
      </div>
      <FloatingLabel htmlFor="job-url" label={jobUrlLabel} icon={Link}>
        <Input
          id="job-url"
          className={styles.urlInput()}
          name="jobUrl"
          placeholder=" "
          type="url"
          value={form.jobUrl}
          aria-invalid={fieldErrors.jobUrl.error ? true : undefined}
          aria-describedby={fieldErrors.jobUrl.errorId}
          onChange={changeJobUrl}
        />
        {fieldErrors.jobUrl.error && (
          <p id={fieldErrors.jobUrl.errorId} role="alert" className={styles.fieldError()}>
            {fieldErrors.jobUrl.error}
          </p>
        )}
      </FloatingLabel>
    </>
  );
}
