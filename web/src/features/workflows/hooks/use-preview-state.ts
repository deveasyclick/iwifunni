import { useMemo } from 'react';
import type { WorkflowChannel } from '@/app/types/workflow';
import { renderPreview } from '../editors/encode';
import { disableMobileBreakpoint } from '../utils/preview';

/**
 * Derives the preview subject using template variable substitution.
 */
export function usePreviewSubject(
  subject: string,
  labelsSubject: string,
  previewContext: Record<string, unknown> | undefined,
): string {
  return useMemo(() => {
    if (!subject.trim()) return labelsSubject;
    return previewContext ? renderPreview(subject, previewContext) : subject;
  }, [subject, labelsSubject, previewContext]);
}

/**
 * Derives the rendered body for a preview.
 * Uses Maily HTML when available, falls back to {{path}} substitution.
 */
export function useRenderedBody(
  body: string,
  channel: WorkflowChannel,
  previewContext: Record<string, unknown> | undefined,
  mailyHtml: string | null,
): string | false {
  return useMemo(() => {
    if (!body.trim()) return `Preview your ${channel} content here.`;
    if (mailyHtml) return mailyHtml;
    return previewContext ? renderPreview(body, previewContext) : body;
  }, [body, channel, previewContext, mailyHtml]);
}

/**
 * Derives a desktop-specific version of the Maily HTML that disables the
 * column-stacking media query (max-width:425px) so columns stay side-by-side
 * even when the preview iframe is narrower than 425px.
 */
export function useRenderedBodyDesktop(
  mailyHtml: string | null,
): string | null {
  return useMemo(() => {
    if (!mailyHtml) return null;
    return disableMobileBreakpoint(mailyHtml);
  }, [mailyHtml]);
}
