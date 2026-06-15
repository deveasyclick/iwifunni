'use client';

import type { SubscriberType } from '@/app/types/subscriber';
import { useEffect, useState } from 'react';
import { DEFAULT_CHANNELS } from '../constants';
import type { Channel, ChannelPreferences } from '../types/channels';

export type BuildPreferencesPayloadResult = {
  global: { channels: Channel[] };
  workflows?: Record<string, { channels: Channel[] }>;
};

export function useSubscriberPreferences(subscriber: SubscriberType | null) {
  const prefs = (subscriber?.preferences ?? {}) as ChannelPreferences;

  const [globalChannels, setGlobalChannels] = useState<Channel[]>(
    (prefs.global?.channels as Channel[]) ?? DEFAULT_CHANNELS,
  );

  const [workflowChannels, setWorkflowChannels] = useState<
    Record<string, Channel[]>
  >(() => {
    const wf: Record<string, Channel[]> = {};
    if (prefs.workflows) {
      for (const [id, val] of Object.entries(prefs.workflows)) {
        wf[id] = (val.channels as Channel[]) ?? [];
      }
    }
    return wf;
  });

  // Reset preferences when subscriber changes
  useEffect(() => {
    const p = (subscriber?.preferences ?? {}) as ChannelPreferences;
    setGlobalChannels((p.global?.channels as Channel[]) ?? DEFAULT_CHANNELS);
    const wf: Record<string, Channel[]> = {};
    if (p.workflows) {
      for (const [id, val] of Object.entries(p.workflows)) {
        wf[id] = (val.channels as Channel[]) ?? [];
      }
    }
    setWorkflowChannels(wf);
  }, [subscriber]);

  const toggleGlobal = (channel: Channel) => {
    setGlobalChannels((prev) =>
      prev.includes(channel)
        ? prev.filter((c) => c !== channel)
        : [...prev, channel],
    );
  };

  const toggleWorkflow = (workflowId: string, channel: Channel) => {
    setWorkflowChannels((prev) => {
      const current = prev[workflowId] ?? [];
      const updated = current.includes(channel)
        ? current.filter((c) => c !== channel)
        : [...current, channel];
      return { ...prev, [workflowId]: updated };
    });
  };

  const buildPreferencesPayload = (): BuildPreferencesPayloadResult => {
    const wfPrefs: Record<string, { channels: Channel[] }> = {};
    for (const [id, channels] of Object.entries(workflowChannels)) {
      const isSame =
        channels.length === globalChannels.length &&
        channels.every((c) => globalChannels.includes(c));
      if (!isSame) {
        wfPrefs[id] = { channels };
      }
    }

    return {
      global: { channels: globalChannels },
      ...(Object.keys(wfPrefs).length > 0 ? { workflows: wfPrefs } : {}),
    };
  };

  return {
    globalChannels,
    workflowChannels,
    toggleGlobal,
    toggleWorkflow,
    buildPreferencesPayload,
  };
}
