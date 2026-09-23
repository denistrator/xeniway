import type { ApplicationEvent, JobApplication } from "@xeniway/shared";

export function withApplicationCreationEvent(
  application: JobApplication,
  events: ApplicationEvent[],
): ApplicationEvent[] {
  const completeEvents = events.some((event) => event.type === "application_created")
    ? [...events]
    : [
        ...events,
        {
          id: -application.id,
          applicationId: application.id,
          type: "application_created" as const,
          title: "application created",
          description: null,
          occurredAt: application.createdAt,
          createdAt: application.createdAt,
          updatedAt: application.createdAt,
          metadata: null,
          isSystem: true,
        },
      ];

  return completeEvents.sort((left, right) => right.occurredAt.localeCompare(left.occurredAt) || right.id - left.id);
}
