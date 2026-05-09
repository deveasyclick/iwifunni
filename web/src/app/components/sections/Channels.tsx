import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@iconify/react";

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
      <p className="text-white/60 mb-12">
        Send notifications where your users are.
      </p>

      <div className="grid md:grid-cols-4 gap-6">
        {items.map((item) => (
          <Card
            key={item.title}
            className="bg-white/5 border-white/10 hover:bg-white/10 transition"
          >
            <CardContent className="p-6 space-y-4 text-center">
              <Icon
                icon={item.icon}
                className="text-3xl mx-auto text-blue-400"
              />
              <h3 className="font-semibold">{item.title}</h3>
              <p className="text-sm text-white/60">{item.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
