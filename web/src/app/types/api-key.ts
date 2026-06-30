export interface ApiKeyItem {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string;
}

export interface ApiKeySecretResponse extends ApiKeyItem {
  key: string;
}

export interface CreateApiKeyPayload {
  name: string;
}
