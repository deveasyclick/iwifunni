export type SubscriberStatusValue = "subscribed" | "unsubscribed" | "bounced";

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
  channels: ("email" | "sms" | "push")[];
  status: SubscriberChannelStatus;
  tags: string[];
  subscriptionDate: Date;
  lastNotificationDate?: Date;
  deleted: boolean;
}
