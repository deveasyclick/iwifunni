import { useCallback, useEffect, useState } from 'react';
import type { UsePayloadEditorReturn } from '@/features/workflows/types/data-panel';

/**
 * Manages the local payload state with JSON validation.
 * Syncs from the parent prop whenever it changes.
 */
export function usePayloadEditor(
  payload: string,
  onPayloadChange: (payload: string) => void,
): UsePayloadEditorReturn {
  const [payloadLocal, setPayloadLocal] = useState(payload);
  const [payloadError, setPayloadError] = useState<string | null>(null);

  // Sync from parent
  useEffect(() => {
    setPayloadLocal(payload);
  }, [payload]);

  const handlePayloadChange = useCallback(
    (value: string) => {
      setPayloadLocal(value);
      try {
        JSON.parse(value);
        setPayloadError(null);
        onPayloadChange(value);
      } catch {
        setPayloadError('Invalid JSON');
      }
    },
    [onPayloadChange],
  );

  return { payloadLocal, payloadError, handlePayloadChange };
}

