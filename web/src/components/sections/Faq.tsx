import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface FaqItem {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
}

const faqItems: FaqItem[] = [
  {
    id: 'faq-1',
    question: 'Can I self-host Iwifunni on my own servers?',
    answer:
      'Yes. Iwifunni is fully self-hostable. We provide a Docker Compose setup that includes the API server, worker, and database. Deploy on any VPS, Kubernetes cluster, or your own bare-metal infrastructure.',
  },
  {
    id: 'faq-2',
    question: 'What channels do you support out of the box?',
    answer:
      'Iwifunni ships with built-in support for in-app notifications (via WebSocket), email (SMTP / SendGrid / SES), and SMS (Twilio). The provider registry makes it straightforward to add custom channels like Slack, Push, or webhooks.',
  },
  {
    id: 'faq-3',
    question: 'How does the workflow builder work?',
    answer:
      'The visual workflow builder lets you chain notification steps — send an in-app alert, wait 5 minutes, then follow up with an email if unread. Each step is configurable with templates, conditions, and delays, all through a drag-and-drop interface.',
  },
  {
    id: 'faq-4',
    question: 'Is there a cloud-hosted version available?',
    answer:
      'Yes. If you prefer not to self-host, we offer a managed cloud version with automatic scaling, monitoring, and support. Check our pricing page for details on plans and limits.',
  },
  {
    id: 'faq-5',
    question: 'What SDKs and integrations are available?',
    answer:
      'We provide a REST API and server-side SDKs for JavaScript/TypeScript, Go, and Python. Our webhook system also lets you connect to any external service for custom event-driven automation.',
  },
  {
    id: 'faq-6',
    question: 'How do you handle delivery failures and retries?',
    answer:
      'Failed deliveries are automatically retried with exponential backoff. You can configure retry policies per channel and per workflow. All delivery events are logged and available through the analytics dashboard and webhook subscriptions.',
  },
];

export default function Faq() {
  return (
    <section className="px-6 py-20 max-w-3xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-2xl font-semibold mb-3">
          Frequently asked questions
        </h2>
        <p className="text-muted-foreground">
          Everything you need to know about Iwifunni.
        </p>
      </div>

      <Accordion type="single" collapsible>
        {faqItems.map((item) => (
          <AccordionItem key={item.id} value={item.id}>
            <AccordionTrigger className="text-left text-base font-medium">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground leading-relaxed">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
