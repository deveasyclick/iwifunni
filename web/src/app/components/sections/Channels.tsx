import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@iconify/react";
import CardBox from "../shared/CardBox";

const items = [
  {
    icon: "mdi:bell-outline",
    title: "In-App",
    desc: "Real-time in-app notifications.",
  },
  {
    icon: "mdi:email-outline",
    title: "Email",
    desc: "Beautiful emails delivered at scale.",
  },
  {
    icon: "mdi:message-outline",
    title: "SMS",
    desc: "Reach users instantly with SMS.",
  },
  {
    icon: "mdi:dots-horizontal",
    title: "More",
    desc: "Push, Slack, Webhooks, and more.",
  },
];
export default function Channels() {
  return (
    <section className="px-6 py-20 max-w-6xl mx-auto text-center">
      <h2 className="text-2xl font-semibold mb-4">Built for every channel</h2>
      <p className="text-muted-foreground mb-12">
        Send notifications where your users are.
      </p>

      <div className="grid md:grid-cols-4 gap-6">
        {items.map((item) => (
          <CardBox key={item.title}>
            <Icon icon={item.icon} className="text-3xl mx-auto text-primary" />
            <h3 className="font-semibold">{item.title}</h3>
            <p className="text-sm text-muted-foreground">{item.desc}</p>
          </CardBox>
        ))}
      </div>
    </section>
  );
}
