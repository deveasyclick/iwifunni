import { Icon } from '@iconify/react';

interface Stat {
  readonly icon: string;
  readonly value: string;
  readonly label: string;
}

const stats: Stat[] = [
  {
    icon: 'mdi:bell-ring-outline',
    value: '10M+',
    label: 'Notifications delivered',
  },
  {
    icon: 'mdi:account-group-outline',
    value: '5K+',
    label: 'Developers onboarded',
  },
  { icon: 'mdi:server-outline', value: '99.9%', label: 'Uptime SLA' },
  { icon: 'mdi:earth', value: '50+', label: 'Countries reached' },
];

function StatItem({ icon, value, label }: Stat) {
  return (
    <div className="flex flex-col items-center gap-1">
      <Icon icon={icon} className="text-2xl text-primary" />
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export default function StatsBar() {
  return (
    <section className="border-y border-border bg-muted/30 px-6 py-14">
      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map((stat) => (
          <StatItem key={stat.label} {...stat} />
        ))}
      </div>
    </section>
  );
}
