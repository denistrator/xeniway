import { Banknote, BriefcaseBusiness, Building2, Link, MapPin } from "lucide-react";
import { FloatingLabel } from "../../../components/ui/floating-label.view";
import { Input } from "../../../components/ui/input.view";
import { type JobFormBasicFieldsProps, useJobFormBasicFieldsPresentation } from "./job-form-basic-fields.model";
import { jobFormBasicFieldsStyles } from "./job-form-basic-fields.styles";

const styles = jobFormBasicFieldsStyles();

export function JobFormBasicFields({ form, update }: JobFormBasicFieldsProps) {
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
  } = useJobFormBasicFieldsPresentation({ form, update });

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
            onChange={changeCompany}
          />
        </FloatingLabel>
        <FloatingLabel htmlFor="job-position" label={positionLabel} icon={BriefcaseBusiness}>
          <Input
            id="job-position"
            className={styles.positionInput()}
            name="position"
            placeholder=" "
            required
            value={form.position}
            onChange={changePosition}
          />
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
            onChange={changeLocation}
          />
        </FloatingLabel>
        <FloatingLabel htmlFor="job-salary" label={salaryLabel} icon={Banknote}>
          <Input
            id="job-salary"
            className={styles.salaryInput()}
            name="salary"
            placeholder=" "
            value={form.salary}
            onChange={changeSalary}
          />
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
          onChange={changeJobUrl}
        />
      </FloatingLabel>
    </>
  );
}
