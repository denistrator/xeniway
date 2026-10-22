import type { JobApplication, JobStatus } from "@xeniway/shared";
import { useRef, useState } from "react";
import { useCanMutate } from "../../../offline/offline-access.view";
import {
  type ApplicationFieldController,
  type EditableApplicationField,
  useApplicationField,
} from "./use-application-field";

export type CompactFieldController = {
  activeField: EditableApplicationField | null;
  warningField: EditableApplicationField | null;
  requestEdit(field: EditableApplicationField): void;
  blur(field: EditableApplicationField, requestedField?: EditableApplicationField): void;
  cancel(field: EditableApplicationField): void;
  save(field: EditableApplicationField, value: string): void;
  selectStatus(status: JobStatus): Promise<void>;
};

export type ApplicationFieldsController = {
  fields: Record<EditableApplicationField, ApplicationFieldController>;
  compact: CompactFieldController;
  saveWarning(): Promise<void>;
  dismissWarning(): void;
  discardWarning(): void;
  departure: {
    dirty: boolean;
    pending: boolean;
    errorKey: string | null;
    onDepartureBlocked(): void;
    discard(): void;
    save(): Promise<boolean>;
  };
};

export function useApplicationFields(application: JobApplication): ApplicationFieldsController {
  const canMutate = useCanMutate();
  const company = useApplicationField(application.id, "company", application.company);
  const position = useApplicationField(application.id, "position", application.position);
  const location = useApplicationField(application.id, "location", application.location);
  const salary = useApplicationField(application.id, "salary", application.salary);
  const jobUrl = useApplicationField(application.id, "jobUrl", application.jobUrl);
  const description = useApplicationField(application.id, "description", application.description);
  const notes = useApplicationField(application.id, "notes", application.notes);
  const status = useApplicationField(application.id, "status", application.status);
  const appliedAt = useApplicationField(application.id, "appliedAt", application.appliedAt);
  const [activeField, setActiveField] = useState<EditableApplicationField | null>(null);
  const [warningField, setWarningField] = useState<EditableApplicationField | null>(null);
  const nextField = useRef<EditableApplicationField | null>(null);
  const fields = { company, position, location, salary, jobUrl, description, notes, status, appliedAt };

  function isDirty(field: EditableApplicationField) {
    return fields[field].isDraftDirty();
  }

  function requestEdit(field: EditableApplicationField) {
    if (activeField === field) {
      return;
    }
    if (warningField) {
      nextField.current = field;
      return;
    }
    if (activeField && isDirty(activeField)) {
      setWarningField(activeField);
      nextField.current = field;
      return;
    }
    if (activeField) {
      fields[activeField].cancel();
    }
    fields[field].beginEdit();
    setActiveField(field);
  }

  function blur(field: EditableApplicationField, requestedField?: EditableApplicationField) {
    if (field !== activeField) {
      return;
    }
    if (isDirty(field)) {
      setWarningField(field);
      if (requestedField) {
        nextField.current = requestedField;
      }
      return;
    }
    fields[field].cancel();
    setActiveField(null);
  }

  function cancel(field: EditableApplicationField) {
    fields[field].cancel();
    setActiveField(null);
    setWarningField(null);
    nextField.current = null;
  }

  function completeEdit() {
    setActiveField(null);
    setWarningField(null);
    const requestedField = nextField.current;
    nextField.current = null;
    if (requestedField && canMutate) {
      fields[requestedField].beginEdit();
      setActiveField(requestedField);
    }
  }

  async function save(field: EditableApplicationField, value?: string) {
    const saved = await fields[field].save(value);
    if (!saved) {
      return false;
    }
    completeEdit();
    return true;
  }

  async function saveWarning() {
    if (warningField) {
      await save(warningField);
    }
  }

  function dismissWarning() {
    setWarningField(null);
    nextField.current = null;
  }

  function discardWarning() {
    if (warningField) {
      fields[warningField].cancel();
      completeEdit();
    }
  }

  async function selectStatus(value: JobStatus) {
    const saved = await status.save(value);
    if (saved) {
      setActiveField(null);
    }
  }

  const fieldNames = Object.keys(fields) as EditableApplicationField[];
  const pendingField = fieldNames.find((field) => fields[field].pending) ?? null;
  const departureField = activeField ?? warningField ?? pendingField;
  const departure = {
    dirty: activeField ? isDirty(activeField) : false,
    pending: departureField ? fields[departureField].pending : false,
    errorKey: departureField ? fields[departureField].errorKey : null,
    onDepartureBlocked: dismissWarning,
    discard() {
      if (departureField) {
        cancel(departureField);
      }
    },
    save() {
      if (!departureField) {
        return Promise.resolve(true);
      }

      return save(departureField);
    },
  };

  return {
    fields,
    compact: {
      activeField,
      warningField,
      requestEdit,
      blur,
      cancel,
      save: (field, value) => void save(field, value),
      selectStatus,
    },
    saveWarning,
    dismissWarning,
    discardWarning,
    departure,
  };
}
