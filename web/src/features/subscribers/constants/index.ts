import type { FilterCardConfig } from '../types/filter';
import type { Channel } from '../types/channels';

const filterCards: FilterCardConfig[] = [
  {
    label: 'Total Subscribers',
    key: 'total_subscribers',
    variant: 'lightprimary',
    ringColor: 'ring-primary',
  },
  {
    label: 'Subscribed',
    key: 'subscribed',
    variant: 'lightsuccess',
    ringColor: 'ring-success',
  },
  {
    label: 'Unsubscribed',
    key: 'unsubscribed',
    variant: 'lightwarning',
    ringColor: 'ring-warning',
  },
  {
    label: 'Bounced',
    key: 'bounced',
    variant: 'lighterror',
    ringColor: 'ring-error',
  },
];

export const CHANNELS: { key: Channel; label: string }[] = [
  { key: 'email', label: 'Email' },
  { key: 'sms', label: 'SMS' },
  { key: 'push', label: 'Push' },
];

export const DEFAULT_CHANNELS: Channel[] = ['email', 'sms', 'push'];

export { filterCards };
