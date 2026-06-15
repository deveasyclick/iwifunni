import type { SubscriberType } from '@/app/types/subscriber';

export type Channel = 'email' | 'sms' | 'push';

export interface ChannelPreferences {
  global?: { channels?: Channel[] };
  workflows?: Record<string, { channels?: Channel[] }>;
}

export interface EditSubscriberSheetProps {
  subscriber: SubscriberType | null;
  open: boolean;
  onClose: () => void;
}
