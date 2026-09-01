import type { CreateApplicationInput, JobApplication } from "@job-tracker/shared";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import { JobForm } from "./job-form";
import { Button } from "./ui/button";

export function JobDrawer({
  job,
  submitting,
  onSave,
  onArchive,
  onClose,
}: {
  job?: JobApplication;
  submitting: boolean;
  onSave: (input: CreateApplicationInput) => void;
  onArchive: () => void;
  onClose: () => void;
}) {
  const drawer = useSelector((state: RootState) => state.ui.drawer);
  if (!drawer.open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/30">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        className="relative ml-auto flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white p-6 shadow-2xl"
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">{drawer.mode === "create" ? "Add application" : "Edit application"}</h2>
          <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
            ×
          </Button>
        </div>
        <JobForm job={job} submitting={submitting} onSubmit={onSave} onCancel={onClose} />
        {drawer.mode === "edit" && (
          <div className="mt-auto border-t border-slate-200 pt-5">
            <Button variant="outline" className="w-full" onClick={onArchive}>
              Archive application
            </Button>
          </div>
        )}
      </aside>
    </div>
  );
}
