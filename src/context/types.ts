export type ContextEvent = {
  id: string;
  kind: string;
  source: string;
  timestamp: string;
  payload: Record<string, unknown>;
  confidence?: number;
  privacy_risk?: number;
  user_id?: string;
};
