export interface WebhookItem {
  id: string;
  url: string;
  events: string[];
  is_active: boolean;
  created_at: string;
}

export interface CreateWebhookPayload {
  url: string;
  secret: string;
  events: string[];
}
