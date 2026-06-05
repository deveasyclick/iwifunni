'use client';

import Link from 'next/link';
import { Icon } from '@iconify/react/dist/iconify.js';
import CardBox from '@/components/card/CardBox';

const TopCards = () => {
  const TopCardInfo = [
    {
      key: 'card4',
      title: 'Notifications',
      stat: '23.4K',
      icon: 'system-uicons:notification',
      rate: '12.3%',
      bgcolor: 'bg-info/10 dark:bg-info/10',
      textclr: 'text-info dark:text-info',
      url: '/apps/notes',
    },
    {
      key: 'card1',
      title: 'Delivered',
      stat: '98.6%',
      icon: 'mdi:email-sent-outline',
      bgcolor: 'bg-success/10 dark:bg-success/10',
      textclr: 'text-success dark:text-success',
      rate: '2.1%',
      url: '/icons/iconify',
    },
    {
      key: 'card2',
      title: 'Subscribers',
      stat: '12.6K',
      icon: 'heroicons:users',
      bgcolor: 'bg-warning/10 dark:bg-warning/10',
      textclr: 'text-warning dark:text-warning',
      rate: '3.4%',
      url: '/apps/blog/post',
    },
    {
      key: 'card3',
      title: 'Workflows',
      stat: '8',
      icon: 'material-symbols:graph-1',
      bgcolor: 'bg-secondary/10 dark:bg-secondary/10',
      textclr: 'text-secondary dark:text-secondary',
      url: '/apps/tickets',
      rate: '1',
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {TopCardInfo.map((item) => {
        return (
          <Link href={item.url} key={item.key}>
            <CardBox className={`w-full p-4`}>
              <div className="hover:scale-105 transition-all ease-in-out">
                <div className="flex gap-3 items-center mb-1">
                  <Icon
                    icon={item.icon}
                    className={`w-6 h-6 ${item.bgcolor} rounded-md ${item.textclr}`}
                  />
                  <p className="text-muted-foreground">{item.title}</p>
                </div>
                <p className={`font-semibold  mb-1 text-xl`}>{item.stat}</p>
                <div className="text-xs font-semibold text-success mb-0 flex items-center">
                  <Icon icon="mdi:arrow-up-thin" className="w-4 h-4" />
                  <div className="flex gap-4">
                    <span>{item.rate}</span>
                    <span className="text-muted-foreground text-xs">
                      vs the last 7 days
                    </span>
                  </div>
                </div>
              </div>
            </CardBox>
          </Link>
        );
      })}
    </div>
  );
};
export { TopCards };
