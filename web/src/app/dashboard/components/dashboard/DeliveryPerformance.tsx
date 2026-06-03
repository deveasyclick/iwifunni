'use client';

import CardBox from '@/app/components/shared/CardBox';
import { Icon } from '@iconify/react';

const deliveryStats = [
  {
    id: 1,
    label: 'Delivery rate',
    value: '98.6%',
    change: '+2.1%',
    trend: 'up',
  },
  {
    id: 2,
    label: 'Bounced',
    value: '1.2%',
    change: '-0.4%',
    trend: 'down',
  },
  {
    id: 3,
    label: 'Failed',
    value: '0.2%',
    change: '-0.1%',
    trend: 'down',
  },
  {
    id: 4,
    label: 'Spam complaints',
    value: '0.01%',
    change: '+0.01%',
    trend: 'up',
  },
];

const DeliveryPerformance = () => {
  return (
    <CardBox className="p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h5 className="card-title">Delivery performance</h5>
        <button className="text-sm text-primary hover:underline">
          View full analytics →
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        {deliveryStats.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-border p-4 bg-muted/30 hover:scale-105 transition-all ease-in-out"
          >
            {/* Label */}
            <p className="text-xs text-muted-foreground mb-2">{item.label}</p>

            {/* Value + Change */}
            <div className="flex items-center gap-2">
              <p className="text-lg font-semibold">{item.value}</p>

              <span
                className={`flex items-center text-xs font-medium ${
                  item.trend === 'up' ? 'text-success' : 'text-error'
                }`}
              >
                <Icon
                  icon={
                    item.trend === 'up'
                      ? 'mdi:arrow-up-thin'
                      : 'mdi:arrow-down-thin'
                  }
                  className="w-4 h-4"
                />
                {item.change}
              </span>
            </div>
          </div>
        ))}
      </div>
    </CardBox>
  );
};

export default DeliveryPerformance;
