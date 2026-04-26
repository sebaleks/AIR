export type ContextEvent = {
  id: string;
  kind: string;
  source: string;
  payload: Record<string, unknown>;
  timestamp: string;
  confidence?: number;
  privacy_risk?: number;
};

export type IngestContextEventInput = Omit<ContextEvent, "id"> & { id?: string };
