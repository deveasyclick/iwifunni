import type { WorkflowChannel } from '@/app/types/workflow';

export const channelConfigLabels: Record<
  WorkflowChannel,
  {
    subject: string;
    body: string;
    hint: string;
  }
> = {
  email: {
    subject: 'Email subject',
    body: 'Email body',
    hint: 'Write the outgoing email subject and body used for this node.',
  },
  sms: {
    subject: 'SMS label',
    body: 'SMS body',
    hint: 'Write the SMS content that will be sent when this step runs.',
  },
  push: {
    subject: 'Push title',
    body: 'Push message',
    hint: 'Write the push title and message for this notification step.',
  },
};
