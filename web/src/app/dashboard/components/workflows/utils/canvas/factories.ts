import type { BuilderNodeDraft } from '@/app/dashboard/components/workflows/types/draft';
import type {
  WorkflowCanvasNode,
  WorkflowCanvasEdge,
} from '@/app/dashboard/components/workflows/types/canvas';

const createCanvasNodeId = () =>
  `canvas_${Math.random().toString(36).slice(2, 10)}`;
const createCanvasEdgeId = () =>
  `edge_${Math.random().toString(36).slice(2, 10)}`;

export const buildCanvasNode = (
  draft: BuilderNodeDraft,
  id = createCanvasNodeId(),
): WorkflowCanvasNode => ({
  id,
  type: 'workflow-step',
  position: { x: 0, y: 0 },
  data: { draft },
});

export const buildCanvasEdge = (
  source: string,
  target: string,
  branch = '',
  id = createCanvasEdgeId(),
): WorkflowCanvasEdge => ({
  id,
  source,
  target,
  sourceHandle: 'default',
  type: 'workflow-edge',
  data: { branch },
});
