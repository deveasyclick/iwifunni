import { Icon } from '@iconify/react';
import { Badge } from '@/components/ui/badge';
import CardBox from '../card/CardBox';

interface Feature {
  readonly icon: string;
  readonly title: string;
  readonly description: string;
  readonly badge?: string;
}

const features: Feature[] = [
  {
    icon: 'mdi:mind-map',
    title: 'Workflow Builder',
    description:
      'Visual drag-and-drop workflow editor to chain channels, delays, and conditions without writing code.',
    badge: 'New',
  },
  {
    icon: 'mdi:chart-timeline-variant',
    title: 'Delivery Analytics',
    description:
      'Track open rates, click rates, delivery status, and failure reasons in real-time dashboards.',
  },
  {
    icon: 'mdi:email-fast-outline',
    title: 'Template Engine',
    description:
      'Design rich email and in-app templates with variables, conditional blocks, and preview.',
    badge: 'Popular',
  },
  {
    icon: 'mdi:api',
    title: 'Unified API',
    description:
      'Single REST API and SDK to send notifications across any channel — no provider lock-in.',
  },
  {
    icon: 'mdi:shield-check-outline',
    title: 'Self-Hostable',
    description:
      'Deploy on your own infrastructure with Docker. Full control over data, compliance, and costs.',
  },
  {
    icon: 'mdi:webhook',
    title: 'Webhook & Events',
    description:
      'Subscribe to delivery events and build custom automations on top of your notification pipeline.',
  },
];

export default function Features() {
  return (
    <section className="px-6 py-20 max-w-6xl mx-auto">
      <div className="text-center mb-14">
        <h2 className="text-2xl font-semibold mb-3">
          Everything you need to ship notifications
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          From simple transactional emails to complex multi-channel workflows —
          Iwifunni handles the heavy lifting.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature) => (
          <CardBox key={feature.title} className="p-6">
            <div className="size-11 flex items-center justify-center rounded-lg bg-lightprimary mb-4">
              <Icon icon={feature.icon} className="text-xl text-primary" />
            </div>

            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-base">{feature.title}</h3>
              {feature.badge && (
                <Badge
                  variant={
                    feature.badge === 'New' ? 'lightInfo' : 'lightSuccess'
                  }
                  className="text-[10px] px-2 py-0.5"
                >
                  {feature.badge}
                </Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              {feature.description}
            </p>
          </CardBox>
        ))}
      </div>
    </section>
  );
}
