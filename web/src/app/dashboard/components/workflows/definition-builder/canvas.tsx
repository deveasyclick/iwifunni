"use client";

import { useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  type Connection,
  Controls,
  type EdgeChange,
  type EdgeMouseHandler,
  type NodeChange,
  type NodeMouseHandler,
  ReactFlow,
} from "@xyflow/react";
import { nodeHeight } from "./constants";
import { edgeTypes } from "./canvas-edge";
import { nodeTypes } from "./canvas-node";
import type { WorkflowCanvasEdge, WorkflowCanvasNode } from "./types";

type WorkflowBuilderCanvasProps = {
  nodes: WorkflowCanvasNode[];
  edges: WorkflowCanvasEdge[];
  onNodesChange: (changes: NodeChange<WorkflowCanvasNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<WorkflowCanvasEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  onPaneClick: () => void;
  onNodeClick: NodeMouseHandler<WorkflowCanvasNode>;
  onEdgeClick: EdgeMouseHandler<WorkflowCanvasEdge>;
};

export const WorkflowBuilderCanvas = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onPaneClick,
  onNodeClick,
  onEdgeClick,
}: WorkflowBuilderCanvasProps) => {
  const edgeCount = useMemo(
    () => edges.filter((edge) => !edge.data?.isTerminal).length,
    [edges],
  );
  const innerCanvasHeight = useMemo(() => {
    const lowestNodeBottom = nodes.reduce(
      (current, node) => Math.max(current, node.position.y + nodeHeight),
      nodeHeight,
    );

    return Math.max(3600, lowestNodeBottom + 1400);
  }, [nodes]);

  const innerCanvasHeightClass = useMemo(() => {
    if (innerCanvasHeight <= 3600) {
      return "h-[3600px]";
    }
    if (innerCanvasHeight <= 4400) {
      return "h-[4400px]";
    }
    if (innerCanvasHeight <= 5200) {
      return "h-[5200px]";
    }
    if (innerCanvasHeight <= 6000) {
      return "h-[6000px]";
    }

    return "h-[6800px]";
  }, [innerCanvasHeight]);

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border/20 bg-dark p-3 text-foreground shadow-lg">
        <div className="mb-3 flex items-center justify-between gap-3 px-2 py-1">
          <div>
            <h6 className="font-medium text-foreground">Workflow Canvas</h6>
            <p className="text-sm text-bodytext">
              Click any node to inspect it. Use the edge plus buttons to insert
              the next step.
            </p>
          </div>
          <span className="text-xs text-bodytext">
            {nodes.length} node{nodes.length === 1 ? "" : "s"} · {edgeCount}{" "}
            edge{edgeCount === 1 ? "" : "s"}
          </span>
        </div>

        <div className="scrollbar-none relative h-168 overflow-x-hidden overflow-y-auto overscroll-contain rounded-3xl border border-border/20 bg-dark [-ms-overflow-style:none] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-20 before:bg-linear-to-b before:from-lightprimary before:to-transparent before:opacity-55 before:content-[''] [&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar]:w-0 [&_.react-flow__attribution]:hidden [&_.react-flow__controls]:overflow-hidden [&_.react-flow__controls]:rounded-2xl [&_.react-flow__controls]:border [&_.react-flow__controls]:border-border/20 [&_.react-flow__controls]:bg-dark [&_.react-flow__controls]:shadow-lg [&_.react-flow__controls-button]:h-9! [&_.react-flow__controls-button]:w-9! [&_.react-flow__controls-button]:border-border/20! [&_.react-flow__controls-button]:bg-transparent! [&_.react-flow__controls-button]:text-bodytext! [&_.react-flow__controls-button:hover]:bg-lightprimary/15! [&_.react-flow__controls-button:hover]:text-primary!">
          <div
            className={`relative min-h-full min-w-full ${innerCanvasHeightClass}`}
          >
            <ReactFlow<WorkflowCanvasNode, WorkflowCanvasEdge>
              defaultViewport={{ x: 0, y: 0, zoom: 1 }}
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onPaneClick={onPaneClick}
              onNodeClick={onNodeClick}
              onEdgeClick={onEdgeClick}
              zoomOnScroll={false}
              zoomOnPinch={false}
              zoomOnDoubleClick={false}
              panOnDrag={false}
              panOnScroll={false}
              preventScrolling={false}
              nodesDraggable={false}
              nodesConnectable={false}
              connectOnClick={false}
              nodesFocusable={false}
              edgesFocusable={false}
              minZoom={1}
              maxZoom={1}
              elementsSelectable
              defaultEdgeOptions={{
                type: "workflow-edge",
              }}
              connectionLineStyle={{
                stroke: "var(--primary)",
                strokeWidth: 2.2,
              }}
              deleteKeyCode={null}
              proOptions={{ hideAttribution: true }}
              className="bg-transparent"
            >
              <svg className="absolute h-0 w-0">
                <defs>
                  <marker
                    id="workflow-arrow"
                    markerWidth="14"
                    markerHeight="14"
                    refX="11"
                    refY="7"
                    orient="auto"
                    markerUnits="strokeWidth"
                  >
                    <path d="M1 1L12 7L1 13L4.2 7L1 1Z" fill="var(--primary)" />
                  </marker>
                </defs>
              </svg>
              <Controls position="bottom-right" showInteractive={false} />
              <Background
                variant={BackgroundVariant.Lines}
                gap={32}
                size={1}
                color="color-mix(in oklab, var(--border) 24%, transparent)"
              />
            </ReactFlow>
          </div>
        </div>
      </div>
    </div>
  );
};
