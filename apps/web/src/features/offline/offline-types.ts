export const OFFLINE_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export type OfflinePreparationProgress = { completed: number; total: number };

export type OfflineAccountRecord = {
  version: 1;
  userId: number;
  email: string;
  verifiedAt: number;
  expiresAt: number;
};

export type OfflineAccountMetadata = OfflineAccountRecord & {
  ready: boolean;
  buildId: string | null;
  /** Internal durable generation, absent only for pre-generation browser records. */
  preparationId?: string;
};
