import type { PreviewSubscriber } from '../types/data-panel';

export function buildPreviewContext(
  subscriber: PreviewSubscriber | null,
  workflow: { id: string; key: string; name: string } | null,
  payloadJson: string,
): Record<string, unknown> {
  const ctx: Record<string, unknown> = {};

  if (subscriber) {
    ctx['subscriber.id'] = subscriber.id;
    if (subscriber.firstName)
      ctx['subscriber.firstName'] = subscriber.firstName;
    if (subscriber.lastName) ctx['subscriber.lastName'] = subscriber.lastName;
    if (subscriber.email) ctx['subscriber.email'] = subscriber.email;
    if (subscriber.phone) ctx['subscriber.phone'] = subscriber.phone;
  }

  if (workflow) {
    ctx['workflow.id'] = workflow.id;
    ctx['workflow.key'] = workflow.key;
    ctx['workflow.name'] = workflow.name;
  }

  try {
    const payloadObj: Record<string, unknown> = JSON.parse(payloadJson);
    if (typeof payloadObj === 'object' && payloadObj !== null) {
      for (const [key, value] of Object.entries(payloadObj)) {
        ctx[`payload.${key}`] = value;
      }
    }
  } catch {
    // invalid json — skip
  }

  return ctx;
}
