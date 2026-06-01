'use client';

import { WorkflowBuilderCanvas } from './canvas';
import { WorkflowDefinitionInspector } from './inspector';
import type { WorkflowDefinitionBuilderProps } from './types';
import { useWorkflowBuilder } from './use-workflow-builder';

export {
  builderDraftFromDefinition,
  createDefaultWorkflowBuilderDraft,
  validateWorkflowDefinitionDraft,
  workflowDefinitionFromBuilderDraft,
} from './utils';
export type {
  BuilderEdgeDraft,
  BuilderNodeDraft,
  WorkflowBuilderDraft,
  WorkflowDefinitionIssue,
} from './types';

export const WorkflowDefinitionBuilder = ({
  value,
  onChange,
  issues,
  workflowSetup,
  autosaveState,
  onConfigureNotificationNode,
  onWorkflowSetupChange,
}: WorkflowDefinitionBuilderProps) => {
  const builder = useWorkflowBuilder({ value, onChange, issues });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.9fr)_360px]">
        <WorkflowBuilderCanvas
          nodes={builder.canvasNodes}
          edges={builder.canvasEdges}
          onNodesChange={builder.onNodesChange}
          onEdgesChange={builder.onEdgesChange}
          onConnect={builder.connectNodes}
          onPaneClick={() =>
            builder.setSelection({ nodeId: null, edgeId: null })
          }
          onNodeClick={(_, node) =>
            builder.setSelection({ nodeId: node.id, edgeId: null })
          }
          onEdgeClick={(_, edge) =>
            builder.setSelection({ nodeId: null, edgeId: edge.id })
          }
        />

        <WorkflowDefinitionInspector
          issues={issues}
          selectedNode={builder.selectedNode}
          selectedEdge={builder.selectedEdge}
          selectedNodeIssues={builder.selectedNodeIssues}
          selectedNodeIncoming={builder.selectedNodeIncoming}
          selectedNodeOutgoing={builder.selectedNodeOutgoing}
          selectedEdgeSourceLabel={builder.selectedEdgeSourceLabel}
          selectedEdgeTargetLabel={builder.selectedEdgeTargetLabel}
          updateNodeDraft={builder.updateNodeDraft}
          removeNode={builder.removeNode}
          removeEdge={builder.removeEdge}
          workflowSetup={workflowSetup}
          autosaveState={autosaveState}
          onConfigureNotificationNode={onConfigureNotificationNode}
          onWorkflowSetupChange={onWorkflowSetupChange}
        />
      </div>
    </div>
  );
};
