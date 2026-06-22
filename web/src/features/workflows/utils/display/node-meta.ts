import {
  BellRing,
  Clock3,
  GitBranch,
  Mail,
  MessageSquare,
  Rocket,
  Smartphone,
} from 'lucide-react';
import type { BuilderNodeDraft } from '@/features/workflows/types/draft';

function notificationIcon(channel: string | undefined): typeof Mail {
  if (channel === 'sms') return MessageSquare;
  if (channel === 'push') return Smartphone;
  return Mail;
}

function notificationIconClass(channel: string | undefined): string {
  if (channel === 'sms')
    return 'border border-success/25 bg-lightsuccess/80 text-success';
  if (channel === 'push')
    return 'border border-warning/25 bg-lightwarning/80 text-warning';
  return 'border border-primary/25 bg-lightprimary/80 text-primary';
}

const getNodeMeta = (node: BuilderNodeDraft) => {
  switch (node.type) {
    case 'trigger':
      return {
        icon: Rocket,
        description: 'Starts the workflow run.',
        iconClassName:
          'border border-success/25 bg-lightsuccess/80 text-success',
        label: 'Trigger',
        status: '',
        statusClassName: '',
      };
    case 'delay':
      return {
        icon: Clock3,
        description: 'Pauses before the next step.',
        iconClassName:
          'border border-warning/25 bg-lightwarning/80 text-warning',
        label: 'Delay',
        status: '',
        statusClassName: '',
      };
    case 'condition':
      return {
        icon: GitBranch,
        description: 'Legacy branching step.',
        iconClassName: 'border border-info/25 bg-lightinfo/80 text-info',
        label: 'Condition',
        status: '',
        statusClassName: '',
      };
    case 'notification': {
      return {
        icon: notificationIcon(node.channel),
        description: 'Sends a configured channel message.',
        iconClassName: notificationIconClass(node.channel),
        label: 'Notification',
        status: '',
        statusClassName: '',
      };
    }
    default:
      return {
        icon: BellRing,
        description: 'Workflow step',
        iconClassName:
          'border border-primary/25 bg-lightprimary/80 text-primary',
        label: 'Step',
        status: '',
        statusClassName: '',
      };
  }
};

export default getNodeMeta;
