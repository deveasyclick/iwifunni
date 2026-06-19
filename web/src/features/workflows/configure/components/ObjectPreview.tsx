import { useMemo } from 'react';
import { colorizeObject } from '../utils/colorize-object';

interface ObjectPreviewProps {
  data: Record<string, unknown>;
}

/**
 * Renders a colorized object literal via dangerouslySetInnerHTML.
 */
export function ObjectPreview({ data }: Readonly<ObjectPreviewProps>) {
  const html = useMemo(() => colorizeObject(data), [data]);

  return (
    <pre
      className="max-h-48 overflow-y-auto rounded-md bg-muted/50 p-3 text-xs font-mono whitespace-pre-wrap break-all"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
