export type ApiKeyStatus = "active" | "revoked" | "rotating" | "expired" | string;

export interface ApiKeyItem {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  status: ApiKeyStatus;
  created_at: string;
}

export interface ApiKeySecretResponse extends ApiKeyItem {
  key: string;
}

export interface CreateApiKeyPayload {
  name: string;
  scopes?: string[];
}
