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

export type TriggerWorkflowPayload = {
  workflow_id: string;
  subscriber_id: string;
  recipient: {
    email?: string;
    phone?: string;
  };
  channels: string[];
  metadata: Record<string, string>;
  is_system?: boolean;
};

export type TriggerWorkflowResponse = {
  status: string;
  notification_id: string;
};

export type DeliveryAttempt = {
  id: string;
  channel: string;
  destination: string;
  status: string;
  error_message?: string;
  provider_message_id?: string;
};

export type NotificationPollResponse = {
  notification: {
    id: string;
    title: string;
    message: string;
    channels: string[];
    status: string;
    is_test: boolean;
    created_at: string;
    updated_at: string;
  } | null;
  delivery_attempts: DeliveryAttempt[];
};

export type TestSendPayload = {
  channel: 'email' | 'sms';
  recipient_email?: string;
  recipient_phone?: string;
  subject?: string;
  body: string;
  sender_name?: string;
  sender_email?: string;
  sender_id?: string;
};

export type TestSendResponse = {
  status: 'queued';
};
