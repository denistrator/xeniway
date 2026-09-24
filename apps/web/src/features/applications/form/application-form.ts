import type { CreateApplicationInput } from "@xeniway/shared";

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
