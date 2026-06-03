import { uuidPattern, zeroUUID } from '../../constants';
import type { BuilderNodeDraft } from '@/app/dashboard/components/workflows/types/draft';

export const hasConfiguredTemplateId = (templateId: string) => {
  const normalizedTemplateId = templateId.trim();

  return (
    normalizedTemplateId !== '' &&
    normalizedTemplateId !== zeroUUID &&
    uuidPattern.test(normalizedTemplateId)
  );
};

export const buildNodeSubtitle = (
  draft: BuilderNodeDraft,
  _triggerEvent: string,
) => {
  switch (draft.type) {
    case 'trigger':
      return '';
    case 'delay':
      return draft.duration ? `Wait ${draft.duration}` : 'Configure delay';
    case 'notification':
      return hasConfiguredTemplateId(draft.templateId)
        ? `${draft.channel.toUpperCase()} content configured`
        : '';
    case 'condition':
      return 'Unsupported in linear workflows';
    default:
      return '';
  }
};
