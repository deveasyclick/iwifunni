import {
  BellRing,
  Clock3,
  GitBranch,
  Mail,
  MessageSquare,
  Rocket,
  Smartphone,
} from 'lucide-react';
import type { WorkflowCanvasNode } from '../definition-builder/types';
import { hasConfiguredTemplateId } from '../definition-builder/utils';

const getNodeMeta = (node: WorkflowCanvasNode['data']['draft']) => {
  switch (node.type) {
    case 'trigger':
      return {
        icon: Rocket,
        description: 'Starts the workflow run.',
        iconClassName:
          'border border-success/25 bg-lightsuccess/80 text-success',
        label: 'Trigger',
        status: 'Entry',
        statusClassName: 'border-success/20 bg-lightsuccess text-success',
      };
    case 'delay':
      return {
        icon: Clock3,
        description: 'Pauses before the next step.',
        iconClassName:
          'border border-warning/25 bg-lightwarning/80 text-warning',
        label: 'Delay',
        status: 'Wait',
        statusClassName: 'border-warning/20 bg-lightwarning text-warning',
      };
    case 'condition':
      return {
        icon: GitBranch,
        description: 'Legacy branching step.',
        iconClassName: 'border border-info/25 bg-lightinfo/80 text-info',
        label: 'Condition',
        status: 'Unsupported',
        statusClassName: 'border-info/20 bg-lightinfo text-info',
      };
    case 'notification': {
      const channelIcon =
        node.channel === 'sms'
          ? MessageSquare
          : node.channel === 'push'
            ? Smartphone
            : Mail;

      return {
        icon: channelIcon,
        description: 'Sends a configured channel message.',
        iconClassName:
          node.channel === 'sms'
            ? 'border border-success/25 bg-lightsuccess/80 text-success'
            : node.channel === 'push'
              ? 'border border-warning/25 bg-lightwarning/80 text-warning'
              : 'border border-primary/25 bg-lightprimary/80 text-primary',
        label: 'Notification',
        status: hasConfiguredTemplateId(node.templateId)
          ? 'Ready'
          : 'Configure',
        statusClassName: hasConfiguredTemplateId(node.templateId)
          ? 'border-primary/20 bg-lightprimary text-primary'
          : 'border-warning/20 bg-lightwarning text-warning',
      };
    }
    default:
      return {
        icon: BellRing,
        description: 'Workflow step',
        iconClassName:
          'border border-primary/25 bg-lightprimary/80 text-primary',
        label: 'Step',
        status: 'Draft',
        statusClassName: 'border-primary/20 bg-lightprimary text-primary',
      };
  }
};

export default getNodeMeta;
