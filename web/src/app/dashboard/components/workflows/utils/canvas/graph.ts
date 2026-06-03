import type { WorkflowBuilderDraft } from '@/app/dashboard/components/workflows/types/draft';
import type {
  WorkflowCanvasNode,
  WorkflowCanvasEdge,
} from '@/app/dashboard/components/workflows/types/canvas';
import { buildCanvasNode, buildCanvasEdge } from './factories';
import { layoutCanvasGraph } from './layout';

export const buildCanvasGraphFromDraft = (draft: WorkflowBuilderDraft) => {
  const nodes = draft.nodes.map((nodeDraft) => buildCanvasNode(nodeDraft));
  const nodeIdByDraftId = new Map<string, string>();
  nodes.forEach((node) => {
    const draftId = node.data.draft.id.trim();
    if (draftId && !nodeIdByDraftId.has(draftId)) {
      nodeIdByDraftId.set(draftId, node.id);
    }
  });

  const edges = draft.edges.flatMap((edge) => {
    const source = nodeIdByDraftId.get(edge.source.trim());
    const target = nodeIdByDraftId.get(edge.target.trim());
    if (!source || !target) {
      return [];
    }
    return [buildCanvasEdge(source, target, edge.branch)];
  });

  return layoutCanvasGraph(nodes, edges);
};
