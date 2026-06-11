import React from 'react';
import { Button } from '@/components/ui/button';
import type { SubscriberCounts } from '../utils/count-subscribers';
import { filterCards } from '../constants';

interface SubscriberFilterProps {
  counts: SubscriberCounts;
  filter: string;
  setFilter: (filter: string) => void;
}

const SubscriberFilter: React.FC<SubscriberFilterProps> = ({
  counts,
  filter,
  setFilter,
}) => {
  return (
    <div className="grid grid-cols-12 gap-6">
      {filterCards.map(({ label, key, variant, ringColor }) => (
        <Button
          key={key}
          type="button"
          variant={variant}
          className={`lg:col-span-3 md:col-span-6 col-span-12 flex-col gap-1 h-auto py-6 px-4 rounded-md ${filter === key ? `ring-2 ${ringColor}` : ''}`}
          onClick={() => setFilter(key)}
        >
          <span className="text-2xl font-semibold leading-none">
            {counts[key as keyof SubscriberCounts]}
          </span>
          <span className="text-base font-normal leading-tight">{label}</span>
        </Button>
      ))}
    </div>
  );
};

export default SubscriberFilter;
