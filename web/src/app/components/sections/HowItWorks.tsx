import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@iconify/react";
import CardBox from "../shared/CardBox";

const steps = [
  {
    title: "Integrate",
    desc: "Add Iwifunni SDK or REST API.",
    icon: "mdi:code-tags",
  },
  {
    title: "Trigger",
    desc: "Send notifications with events.",
    icon: "mdi:flash",
  },
  {
    title: "Deliver",
    desc: "We handle the rest.",
    icon: "mdi:send",
  },
];

export default function HowItWorks() {
  return (
    <section className="px-6 py-20 max-w-6xl mx-auto text-center">
      <h2 className="text-2xl font-semibold mb-4">How it works</h2>
      <p className="text-muted-foreground mb-12">Get started in minutes.</p>

      <div className="grid md:grid-cols-3 gap-6">
        {steps.map((step, i) => (
          <CardBox key={step.title}>
            <Icon icon={step.icon} className="text-3xl text-primary mx-auto" />
            <h3 className="font-semibold">{step.title}</h3>
            <p className="text-sm text-muted-foreground">{step.desc}</p>
          </CardBox>
        ))}
      </div>
    </section>
  );
}
