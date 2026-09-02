import type { CreateApplicationInput, JobApplication } from "@job-tracker/shared";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { jobFormPresentationStorageKey, type RootState, setJobFormPresentation } from "../store";
import { JobDrawer } from "./job-drawer";
import { JobModal } from "./job-modal";

export function JobManager({
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
  const dispatch = useDispatch();
  const drawer = useSelector((state: RootState) => state.ui.drawer);
  const presentation = useSelector((state: RootState) => state.ui.jobFormPresentation);

  useEffect(() => {
    localStorage.setItem(jobFormPresentationStorageKey, presentation);
  }, [presentation]);

  if (!drawer.open) return null;

  const switchPresentation = () => {
    dispatch(setJobFormPresentation(presentation === "drawer" ? "modal" : "drawer"));
  };

  const wrapperProps = {
    mode: drawer.mode,
    presentation,
    job,
    submitting,
    onSave,
    onArchive,
    onClose,
    onSwitchPresentation: switchPresentation,
  };

  return presentation === "modal" ? <JobModal {...wrapperProps} /> : <JobDrawer {...wrapperProps} />;
}
