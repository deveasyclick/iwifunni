export interface ProviderItem {
  id: string;
  environment_id?: string;
  name: string;
  channel: string;
  config?: Record<string, unknown>;
  has_credentials?: boolean;
  is_active: boolean;
  is_primary: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateProviderPayload {
  name: string;
  channel: string;
  credentials: Record<string, unknown>;
  config?: Record<string, unknown>;
}

export interface UpdateProviderStatePayload {
  action: 'enable' | 'disable' | 'set_primary';
}
