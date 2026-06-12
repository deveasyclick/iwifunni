export type SubscriberStatusValue = 'subscribed' | 'unsubscribed' | 'bounced';

export interface SubscriberChannelStatus {
  email?: SubscriberStatusValue;
  sms?: SubscriberStatusValue;
  push?: SubscriberStatusValue;
}

export interface SubscriberType {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  pushToken?: string;
  channels: ('email' | 'sms' | 'push')[];
  status: SubscriberChannelStatus;
  tags: string[];
  metadata?: Record<string, unknown>;
  preferences?: Record<string, unknown>;
  subscriptionDate: string | Date;
  lastNotificationDate?: string | Date;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubscriberPayload {
  name: string;
  email?: string;
  phone?: string;
  pushToken?: string;
  channels?: ('email' | 'sms' | 'push')[];
  status?: SubscriberChannelStatus;
  tags: string[];
  metadata?: Record<string, unknown>;
  preferences?: Record<string, unknown>;
}

export interface UpdateSubscriberPayload extends CreateSubscriberPayload {
  id: string;
}

export interface SubscriberApiResponse<T> {
  data: T;
}
