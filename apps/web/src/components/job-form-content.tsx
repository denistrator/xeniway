import type { CreateApplicationInput, JobApplication } from "@job-tracker/shared";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import type { JobFormPresentation } from "../store";
import { JobForm } from "./job-form";
import { Button } from "./ui/button";

export type JobFormContentProps = {
  presentation: JobFormPresentation;
  mode: "create" | "edit";
  job?: JobApplication;
  submitting: boolean;
  onSave: (input: CreateApplicationInput) => void;
  onArchive: () => void;
  onClose: () => void;
  onSwitchPresentation: () => void;
};

export function JobFormContent({
  presentation,
  mode,
  job,
  submitting,
  onSave,
  onArchive,
  onClose,
  onSwitchPresentation,
}: JobFormContentProps) {
  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold">{mode === "create" ? "Add application" : "Edit application"}</h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={presentation === "drawer" ? "Switch to modal" : "Switch to drawer"}
            title={presentation === "drawer" ? "Switch to modal" : "Switch to drawer"}
            onClick={onSwitchPresentation}
          >
            {presentation === "drawer" ? <PanelRightOpen aria-hidden="true" /> : <PanelRightClose aria-hidden="true" />}
          </Button>
          <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
            ×
          </Button>
        </div>
      </div>
      <JobForm job={job} submitting={submitting} onSubmit={onSave} onCancel={onClose} />
      {mode === "edit" && (
        <div className="mt-auto border-t border-slate-200 pt-5 dark:border-slate-700">
          <Button variant="outline" className="w-full" onClick={onArchive}>
            Archive application
          </Button>
        </div>
      )}
    </>
  );
}
