import type { CreateApplicationInput, JobApplication } from "@xeniway/shared";

export type ApplicationFormState = {
  company: string;
  position: string;
  location: string;
  salary: string;
  jobUrl: string;
  description: string;
  status: CreateApplicationInput["status"];
  appliedAt: string;
  notes: string;
};

export const emptyApplicationForm: ApplicationFormState = {
  company: "",
  position: "",
  location: "",
  salary: "",
  jobUrl: "",
  description: "",
  status: "saved",
  appliedAt: "",
  notes: "",
};

export function applicationToForm(job?: JobApplication | null): ApplicationFormState {
  return job
    ? {
        company: job.company,
        position: job.position,
        location: job.location ?? "",
        salary: job.salary ?? "",
        jobUrl: job.jobUrl ?? "",
        description: job.description ?? "",
        status: job.status,
        appliedAt: job.appliedAt ?? "",
        notes: job.notes ?? "",
      }
    : emptyApplicationForm;
}

export function normalizeApplicationForm(form: ApplicationFormState): CreateApplicationInput {
  return {
    ...form,
    location: form.location || null,
    salary: form.salary || null,
    jobUrl: form.jobUrl || null,
    description: form.description || null,
    appliedAt: form.appliedAt || null,
    notes: form.notes || null,
  };
}
