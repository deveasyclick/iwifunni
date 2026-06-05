export type WorkflowEventPayload = {
  event: string;
  subscriber_id?: string;
  data?: Record<string, unknown>;
};

export type WorkflowRequestInit = Omit<RequestInit, 'body'> & {
  body?: BodyInit | object;
};

export type TemplateUpdatePayload = {
  subject?: string;
  body: string;
};
