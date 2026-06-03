export interface TemplateItem {
  id: string;
  environment_id: string;
  name: string;
  channel: string;
  subject?: string | null;
  body: string;
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplatePayload {
  name: string;
  channel: string;
  subject?: string;
  body: string;
}
