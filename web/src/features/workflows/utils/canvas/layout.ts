import dagre from '@dagrejs/dagre';
import { nodeWidth, nodeHeight } from '../../constants';
import type {
  WorkflowCanvasNode,
  WorkflowCanvasEdge,
} from '@/features/workflows/types/canvas';

export const layoutCanvasGraph = (
  nodes: WorkflowCanvasNode[],
  edges: WorkflowCanvasEdge[],
) => {
  const graph = new dagre.graphlib.Graph<
    Record<string, unknown>,
    Record<string, unknown>
  >();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: 'TB',
    nodesep: 40,
    ranksep: 34,
    marginx: 24,
    marginy: 24,
  });

  nodes.forEach((node) =>
    graph.setNode(node.id, { width: nodeWidth, height: nodeHeight }),
  );
  edges.forEach((edge) => graph.setEdge(edge.source, edge.target));
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  dagre.layout(graph);

  return {
    nodes: nodes.map((node) => {
      const positioned = graph.node(node.id);
      return {
        ...node,
        position: positioned
          ? {
              x: (positioned as Record<string, number>).x - nodeWidth / 2,
              y: (positioned as Record<string, number>).y - nodeHeight / 2,
            }
          : node.position,
      };
    }),
    edges,
  };
};
