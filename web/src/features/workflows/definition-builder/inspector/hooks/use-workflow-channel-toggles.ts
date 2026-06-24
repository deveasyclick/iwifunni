'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  BuilderNodeDraft,
  WorkflowDefinitionIssue,
} from '@/features/workflows/types/draft';
import { zeroUUID } from '@/features/workflows/constants';

export interface ChannelToggle {
  channel: string;
  nodeName: string;
  isValid: boolean;
  reason?: string;
}

function extractChannelToggles(
  builderNodes: BuilderNodeDraft[] | undefined,
  issues: WorkflowDefinitionIssue[] | undefined,
): ChannelToggle[] {
  if (!builderNodes) return [];

  const nodesWithIssues = new Set<number>();
  if (issues) {
    for (const issue of issues) {
      const match = issue.path.match(/^nodes\.(\d+)/);
      if (match) {
        nodesWithIssues.add(parseInt(match[1], 10));
      }
    }
  }

  const toggles: ChannelToggle[] = [];
  builderNodes.forEach((node, index) => {
    if (node.type !== 'notification') return;
    if (!node.channel) return;

    const hasTemplate = node.templateId && node.templateId !== zeroUUID;
    const hasIssues = nodesWithIssues.has(index);
    const isValid = !!hasTemplate && !hasIssues;

    let reason: string | undefined;
    if (!hasTemplate) {
      reason = 'No template configured';
    } else if (hasIssues) {
      reason = 'This node needs attention';
    }

    toggles.push({
      channel: node.channel,
      nodeName: node.name || `${node.channel} notification`,
      isValid,
      reason,
    });
  });

  return toggles;
}

interface UseWorkflowChannelTogglesOptions {
  readonly builderNodes: BuilderNodeDraft[] | undefined;
  readonly issues: WorkflowDefinitionIssue[] | undefined;
}

interface UseWorkflowChannelTogglesReturn {
  channelToggles: ChannelToggle[];
  selectedChannels: string[];
  setSelectedChannels: (channels: string[]) => void;
  toggleChannel: (channel: string) => void;
}

export function useWorkflowChannelToggles({
  builderNodes,
  issues,
}: UseWorkflowChannelTogglesOptions): UseWorkflowChannelTogglesReturn {
  const channelToggles = useMemo(
    () => extractChannelToggles(builderNodes, issues),
    [builderNodes, issues],
  );
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const initializedRef = useRef(false);

  // Initialize to valid channels once, then only add newly valid channels
  // without removing the user's manual toggles.
  useEffect(() => {
    const validChannels = channelToggles
      .filter((t) => t.isValid)
      .map((t) => t.channel);

    if (!initializedRef.current) {
      initializedRef.current = true;
      setSelectedChannels(validChannels);
      return;
    }

    // Subsequent changes: add newly valid channels, keep existing selection,
    // remove channels that no longer exist in the toggle list
    setSelectedChannels((prev) => {
      const toggleSet = new Set(channelToggles.map((t) => t.channel));
      const merged = new Set(prev);
      for (const ch of validChannels) {
        merged.add(ch);
      }
      return Array.from(merged).filter((ch) => toggleSet.has(ch));
    });
  }, [channelToggles]);

  const toggleChannel = (channel: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channel)
        ? prev.filter((c) => c !== channel)
        : [...prev, channel],
    );
  };

  return {
    channelToggles,
    selectedChannels,
    setSelectedChannels,
    toggleChannel,
  };
}
