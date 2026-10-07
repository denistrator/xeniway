import { type DehydratedState, hashKey } from "@tanstack/react-query";
import {
  type ApplicationEventType,
  type ApplicationListResponse,
  applicationEventTypeSchema,
  type JobStatus,
  jobStatusSchema,
} from "@xeniway/shared";

type Validator<T> = (value: unknown) => value is T;
type Shape = Record<string, (value: unknown) => boolean>;
type ValidatedShape<S extends Shape> = {
  [Key in keyof S]: S[Key] extends Validator<infer Value> ? Value : unknown;
};
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function hasShape<S extends Shape>(value: unknown, shape: S): value is ValidatedShape<S> {
  if (!isRecord(value)) {
    return false;
  }
  let fieldCount = 0;
  for (const key in shape) {
    if (!Object.hasOwn(shape, key)) {
      continue;
    }
    fieldCount += 1;
    if (!Object.hasOwn(value, key) || !shape[key](value[key])) {
      return false;
    }
  }
  return Object.keys(value).length === fieldCount;
}
const matchesShape =
  <S extends Shape>(shape: S): Validator<ValidatedShape<S>> =>
  (value): value is ValidatedShape<S> =>
    hasShape(value, shape);
export const isTimestamp: Validator<number> = (value): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const isPositiveId: Validator<number> = (value): value is number => isTimestamp(value) && value > 0;
const isText: Validator<string> = (value) => typeof value === "string";
const nullable =
  <T>(check: Validator<T>): Validator<T | null> =>
  (value) =>
    value === null || check(value);
const isDate: Validator<string> = (value): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;
const isDateTime: Validator<string> = (value): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(value) &&
  isDate(value.slice(0, 10)) &&
  Number.isFinite(Date.parse(value));
const isStatus: Validator<JobStatus> = (value): value is JobStatus => jobStatusSchema.safeParse(value).success;
const arrayOf =
  <T>(check: Validator<T>): Validator<T[]> =>
  (value) =>
    Array.isArray(value) && value.every(check);
const applicationShape = {
  id: isPositiveId,
  company: isText,
  position: isText,
  location: nullable(isText),
  salary: nullable(isText),
  jobUrl: nullable(isText),
  description: nullable(isText),
  status: isStatus,
  sortOrder: isTimestamp,
  appliedAt: nullable(isDate),
  notes: nullable(isText),
  createdAt: isDateTime,
  updatedAt: isDateTime,
  archivedAt: nullable(isDateTime),
  blacklistedAt: nullable(isDateTime),
  blacklistReason: nullable(isText),
};
const preparationShape = {
  companyResearch: nullable(isText),
  talkingPoints: nullable(isText),
  interviewerQuestions: nullable(isText),
  updatedAt: nullable(isDateTime),
};
const contactShape = {
  id: isPositiveId,
  applicationId: isPositiveId,
  name: isText,
  role: isText,
  email: nullable(isText),
  phone: nullable(isText),
  profileUrl: nullable(isText),
  notes: nullable(isText),
  createdAt: isDateTime,
  updatedAt: isDateTime,
};
const followUpShape = {
  id: isPositiveId,
  applicationId: isPositiveId,
  title: isText,
  dueDate: isDate,
  notes: nullable(isText),
  completedAt: nullable(isDateTime),
  createdAt: isDateTime,
  updatedAt: isDateTime,
};
const statusChangeShape = { from: isStatus, to: isStatus };
const eventShape = {
  id: (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value !== 0,
  applicationId: isPositiveId,
  type: (value: unknown): value is ApplicationEventType => applicationEventTypeSchema.safeParse(value).success,
  title: isText,
  description: nullable(isText),
  occurredAt: isDateTime,
  createdAt: isDateTime,
  updatedAt: isDateTime,
  metadata: nullable(matchesShape(statusChangeShape)),
  isSystem: (value: unknown): value is boolean => typeof value === "boolean",
};
function isEvent(value: unknown): value is ValidatedShape<typeof eventShape> {
  if (!hasShape(value, eventShape)) {
    return false;
  }
  if (value.id > 0) {
    return true;
  }
  // The API derives exactly this immutable marker for pre-history applications.
  return (
    value.id === -value.applicationId &&
    value.type === "application_created" &&
    value.title === "application created" &&
    value.description === null &&
    value.metadata === null &&
    value.isSystem === true &&
    value.occurredAt === value.createdAt &&
    value.createdAt === value.updatedAt
  );
}

const listShape = {
  applications: arrayOf(matchesShape(applicationShape)),
};
const workspaceShape = {
  application: matchesShape(applicationShape),
  events: arrayOf(isEvent),
  preparation: matchesShape(preparationShape),
  contacts: arrayOf(matchesShape(contactShape)),
  followUpTasks: arrayOf(matchesShape(followUpShape)),
};
const responseEnvelopeShape = { data: isRecord };
type OfflineQueryKey =
  | ["applications", number, "list", "active" | "archive" | "blacklist"]
  | ["applications", number, "detail", number];

function eligibleKey(key: unknown, userId: number): key is OfflineQueryKey {
  if (!Array.isArray(key) || key.length !== 4) {
    return false;
  }
  const belongsToAccount = key[0] === "applications" && key[1] === userId;
  if (!belongsToAccount) {
    return false;
  }
  const isCollection = key[3] === "active" || key[3] === "archive" || key[3] === "blacklist";
  const isListKey = key[2] === "list" && isCollection;
  const isDetailKey = key[2] === "detail" && isPositiveId(key[3]);
  return isListKey || isDetailKey;
}
function validResponse(value: unknown, key: readonly unknown[]): boolean {
  if (!hasShape(value, responseEnvelopeShape)) {
    return false;
  }
  if (key[2] === "list") {
    return hasShape(value.data, listShape);
  }
  if (!hasShape(value.data, workspaceShape)) {
    return false;
  }
  const data = value.data;
  if (data.events.some((item) => item.id < 0 && item.createdAt !== data.application.createdAt)) {
    return false;
  }
  return (
    data.application.id === key[3] &&
    [data.events, data.contacts, data.followUpTasks].every((items) =>
      items.every((item) => item.applicationId === key[3]),
    )
  );
}

/** Copy only allowlisted application responses and inert query state; never persist query metadata or promises. */
export function deriveOfflineSnapshot(userId: number, value: unknown, now: number): DehydratedState {
  if (!isRecord(value) || !Array.isArray(value.queries) || !Array.isArray(value.mutations)) {
    throw new Error("Invalid offline snapshot");
  }
  const queries: DehydratedState["queries"] = [];
  const hashes = new Set<string>();
  for (const query of value.queries) {
    if (
      !isRecord(query) ||
      !eligibleKey(query.queryKey, userId) ||
      !isRecord(query.state) ||
      query.state.status !== "success"
    ) {
      continue;
    }
    const state = query.state;
    if (
      !validResponse(state.data, query.queryKey) ||
      !isTimestamp(state.dataUpdatedAt) ||
      state.dataUpdatedAt > now ||
      !isTimestamp(state.dataUpdateCount)
    ) {
      throw new Error("Invalid offline application response");
    }
    const queryHash = hashKey(query.queryKey);
    if (hashes.has(queryHash)) {
      throw new Error("Duplicate offline application query");
    }
    hashes.add(queryHash);
    queries.push({
      queryKey: [...query.queryKey],
      queryHash,
      dehydratedAt: now,
      state: {
        data: state.data,
        dataUpdatedAt: state.dataUpdatedAt,
        dataUpdateCount: state.dataUpdateCount,
        error: null,
        errorUpdateCount: 0,
        errorUpdatedAt: 0,
        fetchFailureCount: 0,
        fetchFailureReason: null,
        fetchMeta: null,
        isInvalidated: false,
        status: "success",
        fetchStatus: "idle",
      },
    });
  }
  return { queries, mutations: [] };
}

const storedSnapshotShape = {
  queries: (value: unknown): value is unknown[] => Array.isArray(value),
  mutations: (value: unknown) => Array.isArray(value) && value.length === 0,
};
const storedStateShape = {
  data: (_value: unknown): _value is unknown => true,
  dataUpdatedAt: isTimestamp,
  dataUpdateCount: isTimestamp,
  error: (value: unknown): value is null => value === null,
  errorUpdateCount: (value: unknown): value is 0 => value === 0,
  errorUpdatedAt: (value: unknown): value is 0 => value === 0,
  fetchFailureCount: (value: unknown): value is 0 => value === 0,
  fetchFailureReason: (value: unknown): value is null => value === null,
  fetchMeta: (value: unknown): value is null => value === null,
  isInvalidated: (value: unknown): value is false => value === false,
  status: (value: unknown): value is "success" => value === "success",
  fetchStatus: (value: unknown): value is "idle" => value === "idle",
};
const storedQueryShape = {
  queryKey: (value: unknown): value is unknown[] => Array.isArray(value),
  queryHash: isText,
  dehydratedAt: isTimestamp,
  state: matchesShape(storedStateShape),
};

/** Stored records must already be canonical. Filtering corrupt storage could silently hide unsafe queries. */
export function validateStoredSnapshot(userId: number, value: unknown, savedAt: number): DehydratedState | null {
  if (!hasShape(value, storedSnapshotShape)) {
    return null;
  }
  const queries: DehydratedState["queries"] = [];
  const hashes = new Set<string>();
  for (const query of value.queries) {
    if (!hasShape(query, storedQueryShape) || !eligibleKey(query.queryKey, userId)) {
      return null;
    }
    if (
      query.dehydratedAt !== savedAt ||
      query.queryHash !== hashKey(query.queryKey) ||
      hashes.has(query.queryHash) ||
      query.state.dataUpdatedAt > savedAt ||
      !validResponse(query.state.data, query.queryKey)
    ) {
      return null;
    }
    hashes.add(query.queryHash);
    queries.push({ ...query, queryKey: [...query.queryKey], state: { ...query.state } });
  }
  return { queries, mutations: [] };
}

export function hasPreparedLists(snapshot: DehydratedState): boolean {
  return ["active", "archive", "blacklist"].every((name) =>
    snapshot.queries.some((query) => query.queryKey[2] === "list" && query.queryKey[3] === name),
  );
}

/** New full preloads must durably contain a detail response for every listed ID. */
export function hasPreparedWorkspaces(snapshot: DehydratedState): boolean {
  const detailIds = new Set(
    snapshot.queries.filter((query) => query.queryKey[2] === "detail").map((query) => query.queryKey[3]),
  );
  return (
    hasPreparedLists(snapshot) &&
    snapshot.queries
      .filter((query) => query.queryKey[2] === "list")
      .every((query) =>
        (query.state.data as ApplicationListResponse).data.applications.every((application) =>
          detailIds.has(application.id),
        ),
      )
  );
}
