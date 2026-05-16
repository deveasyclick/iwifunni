export interface ProviderItem {
  id: string;
  environment_id?: string;
  name: string;
  channel: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateProviderPayload {
  name: string;
  channel: string;
  credentials: Record<string, unknown>;
  config?: Record<string, unknown>;
}