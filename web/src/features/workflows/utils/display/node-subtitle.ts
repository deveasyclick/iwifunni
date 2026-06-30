import type { BuilderNodeDraft } from '@/features/workflows/types/draft';
import { uuidPattern, zeroUUID } from '../../constants';

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
    case 'condition':
      return 'Unsupported in linear workflows';
    default:
      return '';
  }
};
