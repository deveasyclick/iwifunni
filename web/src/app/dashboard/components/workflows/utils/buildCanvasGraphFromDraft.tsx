import type { WorkflowBuilderDraft } from '../definition-builder';
import {
  buildCanvasEdge,
  buildCanvasNode,
  layoutCanvasGraph,
} from '../definition-builder/utils';

const buildCanvasGraphFromDraft = (draft: WorkflowBuilderDraft) => {
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

export default buildCanvasGraphFromDraft;
