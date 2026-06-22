'use client';

import { Icon } from '@iconify/react/dist/iconify.js';
import CardBox from '@/components/card/CardBox';
import { STAT_CARDS } from '../constants';
import { formatCount } from '../utils';

interface TopCardsProps {
  readonly stats?: {
    total_notifications: number;
    total_subscribers: number;
    total_workflows: number;
    active_providers: number;
  };
  readonly isLoading?: boolean;
}

const TopCards = ({ stats, isLoading }: TopCardsProps) => {
  const getStatValue = (key: string): string => {
    if (!stats) return '—';
    switch (key) {
      case 'notifications':
        return formatCount(stats.total_notifications);
      case 'subscribers':
        return formatCount(stats.total_subscribers);
      case 'workflows':
        return String(stats.total_workflows);
      case 'providers':
        return String(stats.active_providers);
      default:
        return '—';
    }
  };

  const statPlaceholder = isLoading ? (
    <span className="text-muted-foreground">...</span>
  ) : null;

  const cards = STAT_CARDS.map((card) => ({
    ...card,
    stat: getStatValue(card.key),
  }));

  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map((item) => (
        <CardBox key={item.key} className="w-full p-4">
          <div className="hover:scale-105 transition-all ease-in-out">
            <div className="flex gap-3 items-center mb-1">
              <Icon
                icon={item.icon}
                className={`w-6 h-6 ${item.bgcolor} rounded-md ${item.textclr}`}
              />
              <p className="text-muted-foreground">{item.title}</p>
            </div>
            <p className={`font-semibold mb-1 text-xl`}>
              {statPlaceholder ?? item.stat}
            </p>
          </div>
        </CardBox>
      ))}
    </div>
  );
};

export { TopCards };
