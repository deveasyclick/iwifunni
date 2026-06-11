import type { FilterCardConfig } from '../types/filter';

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

export { filterCards };
