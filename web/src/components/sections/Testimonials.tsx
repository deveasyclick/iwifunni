import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import CardBox from '../card/CardBox';

interface Testimonial {
  readonly quote: string;
  readonly name: string;
  readonly role: string;
  readonly initials: string;
}

const testimonials: Testimonial[] = [
  {
    quote:
      'We moved from SendGrid + custom in-app code to Iwifunni and cut our notification code by 70%. The workflow builder is a game-changer for our product team.',
    name: 'Alex Rivera',
    role: 'CTO at Scaleable',
    initials: 'AR',
  },
  {
    quote:
      'Self-hosting Iwifunni was dead simple. One docker-compose and we had a production-grade notification system running behind our own firewall.',
    name: 'Sarah Chen',
    role: 'Engineering Lead, Finlytics',
    initials: 'SC',
  },
  {
    quote:
      "The unified API means I don't have to think about which provider to use. I just send a notification and Iwifunni routes it to the right channel.",
    name: 'Marcus Johnson',
    role: 'Full-stack Developer',
    initials: 'MJ',
  },
];

function TestimonialCard({ quote, name, role, initials }: Testimonial) {
  return (
    <CardBox className="p-6 flex flex-col justify-between">
      <p className="text-sm text-muted-foreground leading-relaxed italic">
        &ldquo;{quote}&rdquo;
      </p>

      <div className="flex items-center gap-3 mt-6">
        <Avatar>
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-medium">{name}</p>
          <p className="text-xs text-muted-foreground">{role}</p>
        </div>
      </div>
    </CardBox>
  );
}

export default function Testimonials() {
  return (
    <section className="px-6 py-20 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-2xl font-semibold mb-3">Loved by developers</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            See what teams are saying about their experience with Iwifunni.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((item) => (
            <TestimonialCard key={item.name} {...item} />
          ))}
        </div>
      </div>
    </section>
  );
}
