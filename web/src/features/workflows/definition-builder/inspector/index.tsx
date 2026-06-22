'use client';

import { useState, type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, Copy } from 'lucide-react';
import {
  buildNodeDescription,
  getNodeDisplayName,
} from '@/features/workflows/utils/display';
import type { WorkflowDefinitionInspectorProps } from '../../types/ui';
import { DelayConfig } from './delay-config';
import { NotificationConfig } from './notification-config';
import { EdgeInfo } from './edge-info';
import { NodeIssues } from './node-issues';
import { WorkflowSetupPanel } from './workflow-setup-panel';

function inspectorTitleText(
  selectedNode: unknown,
  selectedEdge: unknown,
): string {
  if (selectedNode) return 'Configure step';
  if (selectedEdge) return 'Configure transition';
  return 'Configure workflow';
}

function inspectorDescription(
  selectedNode: unknown,
  selectedEdge: unknown,
): string {
  if (selectedNode) return 'Adjust this step without changing its system ID.';
  if (selectedEdge)
    return 'Review the current linear transition between steps.';
  return 'Review workflow-level details and autosave status.';
}

export const WorkflowDefinitionInspector = ({
  selectedNode,
  selectedEdge,
  selectedNodeIssues,
  selectedNodeIncoming,
  selectedNodeOutgoing,
  selectedEdgeSourceLabel,
  selectedEdgeTargetLabel,
  updateNodeDraft,
  workflowSetup,
  autosaveState,
  onConfigureNotificationNode,
  onWorkflowSetupChange,
}: WorkflowDefinitionInspectorProps) => {
  const [copiedNodeId, setCopiedNodeId] = useState<string | null>(null);

  const inspectorTitle = inspectorTitleText(selectedNode, selectedEdge);

  const copyNodeId = async (nodeId: string) => {
    try {
      await navigator.clipboard.writeText(nodeId);
      setCopiedNodeId(nodeId);
      window.setTimeout(() => {
        setCopiedNodeId((current) => (current === nodeId ? null : current));
      }, 1600);
    } catch {
      setCopiedNodeId(null);
    }
  };

  let inspectorPanel: ReactNode;
  if (selectedNode) {
    inspectorPanel = (
      <div className="space-y-5">
        {/* Node header info */}
        <div className="space-y-1">
          <div>
            <p className="text-sm font-medium">
              {getNodeDisplayName(selectedNode.data.draft)}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {selectedNode.data.draft.type} node
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            {buildNodeDescription(selectedNode.data.draft)}
          </p>
        </div>

        {/* Status badge — hidden for trigger nodes */}
        {selectedNode.data.draft.type !== 'trigger' && (
          <div className="rounded-xl border border-border p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Status
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Badge
                variant={
                  selectedNodeIssues.length === 0 ? 'lightSuccess' : 'secondary'
                }
              >
                {selectedNodeIssues.length === 0 ? 'ready' : 'needs attention'}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {selectedNodeIncoming} in · {selectedNodeOutgoing} out
              </span>
            </div>
          </div>
        )}

        {/* Step name */}
        <div>
          <label className="mb-2 block text-sm font-medium">Step name</label>
          <Input
            value={selectedNode.data.draft.name}
            onChange={(event) =>
              updateNodeDraft(selectedNode.id, (draft) => ({
                ...draft,
                name: event.target.value,
              }))
            }
            placeholder="Enter a step name"
          />
        </div>

        {/* Step ID — with copy button */}
        <div>
          <label className="mb-2 block text-sm font-medium">
            {selectedNode.data.draft.type === 'trigger'
              ? 'Workflow key'
              : 'Step ID'}
          </label>
          <div className="flex items-center gap-2">
            <Input
              value={
                selectedNode.data.draft.type === 'trigger'
                  ? (workflowSetup?.key ?? selectedNode.data.draft.id)
                  : selectedNode.data.draft.id
              }
              readOnly
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                void copyNodeId(
                  selectedNode.data.draft.type === 'trigger'
                    ? (workflowSetup?.key ?? selectedNode.data.draft.id)
                    : selectedNode.data.draft.id,
                )
              }
            >
              {copiedNodeId === selectedNode.data.draft.id ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Type-specific configs */}
        {selectedNode.data.draft.type === 'delay' && (
          <DelayConfig
            draft={selectedNode.data.draft}
            updateNodeDraft={updateNodeDraft}
          />
        )}

        {selectedNode.data.draft.type === 'notification' && (
          <NotificationConfig
            draft={selectedNode.data.draft}
            onConfigureNotificationNode={onConfigureNotificationNode}
          />
        )}

        {selectedNode.data.draft.type === 'condition' && (
          <div className="rounded-xl border border-warning/20 bg-warning/5 p-3 text-sm text-warningemphasis">
            Condition steps are legacy branching nodes. This linear builder does
            not support editing or publishing them.
          </div>
        )}

        {/* Issues */}
        <NodeIssues issues={selectedNodeIssues} />
      </div>
    );
  } else if (selectedEdge) {
    inspectorPanel = (
      <EdgeInfo
        sourceLabel={selectedEdgeSourceLabel}
        targetLabel={selectedEdgeTargetLabel}
      />
    );
  } else {
    inspectorPanel = (
      <WorkflowSetupPanel
        workflowSetup={workflowSetup}
        autosaveState={autosaveState}
        onWorkflowSetupChange={onWorkflowSetupChange}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-4">
          <h6 className="font-medium">{inspectorTitle}</h6>
          <p className="text-sm text-muted-foreground">
            {inspectorDescription(selectedNode, selectedEdge)}
          </p>
        </div>

        {inspectorPanel}
      </div>
    </div>
  );
};
