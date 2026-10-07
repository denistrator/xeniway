import type { ApplicationEvent, ApplicationEventInput } from "@xeniway/shared";

export interface ApplicationActivityProps {
  applicationId: number;
}

export interface ApplicationActivitySectionProps extends ApplicationActivityProps {
  events: ApplicationEvent[];
  className?: string;
}

export interface ApplicationActivityTimelineProps {
  events: ApplicationEvent[];
  onEdit: (event: ApplicationEvent) => void;
  onDelete: (event: ApplicationEvent) => void;
}

export interface ApplicationActivityEventProps {
  event: ApplicationEvent;
  formattedOccurredAt: string;
  onEdit: (event: ApplicationEvent) => void;
  onDelete: (event: ApplicationEvent) => void;
}

export interface ApplicationActivityFormProps {
  event?: ApplicationEvent;
  onSubmit: (input: ApplicationEventInput) => Promise<void>;
  onCancel: () => void;
}
