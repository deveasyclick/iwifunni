import type { JSONContent } from '@tiptap/core';
import { useEffect, useRef, useState } from 'react';
import type { WorkflowChannel } from '@/app/types/workflow';
import type { UseEmailPreviewReturn } from '@/features/workflows/types/data-panel';
import { renderPreview } from '../editors/encode';

/**
 * Renders Maily JSON content into proper email HTML using @maily-to/render.
 * Falls back to the simple renderPreview ({{path}} substitution) when
 * contentJson is not available (initial load or SMS/push channels).
 */
export function useEmailPreview(
  channel: WorkflowChannel,
  body: string,
  contentJson: JSONContent | null | undefined,
  previewContext: Record<string, unknown> | undefined,
): UseEmailPreviewReturn {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Track the most recent render request so we can cancel stale ones
  const renderIdRef = useRef(0);

  useEffect(() => {
    if (channel !== 'email' || !contentJson) {
      // Fall back to simple {{path}} substitution
      setLoading(false);
      setHtml(renderPreview(body, previewContext ?? {}));
      return;
    }

    const id = ++renderIdRef.current;
    let cancelled = false;
    setLoading(true);

    const render = async () => {
      try {
        // Dynamic import to avoid bundling heavy deps on non-email pages
        const { Maily } = await import('@maily-to/render');

        if (cancelled) return;

        const maily = new Maily(contentJson);

        // Set variable values from preview context
        if (previewContext) {
          const stringValues: Record<string, string> = {};
          for (const [key, value] of Object.entries(previewContext)) {
            if (
              typeof value === 'string' ||
              typeof value === 'number' ||
              typeof value === 'boolean'
            ) {
              stringValues[key] = String(value);
            }
          }
          if (Object.keys(stringValues).length > 0) {
            maily.setVariableValues(stringValues);
          }
        }

        const emailHtml = await maily.render({ pretty: false });

        if (!cancelled && id === renderIdRef.current) {
          setHtml(emailHtml);
        }
      } catch (err) {
        console.error(
          'Failed to render email preview with @maily-to/render, falling back:',
          err,
        );
        if (!cancelled) {
          // Fall back to simple rendering on error
          setHtml(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void render();

    return () => {
      cancelled = true;
    };
  }, [channel, contentJson, previewContext, body]);

  return { html, loading };
}
