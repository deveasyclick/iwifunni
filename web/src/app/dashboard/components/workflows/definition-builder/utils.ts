import dagre from "@dagrejs/dagre";
import type {
  WorkflowChannel,
  WorkflowDefinition,
  WorkflowEdge,
  WorkflowNode,
} from "@/app/types/workflow";
import {
  durationPattern,
  nodeHeight,
  nodeWidth,
  notificationChannels,
  uuidPattern,
  zeroUUID,
} from "./constants";
import type {
  BuilderNodeDraft,
  DelayUnit,
  WorkflowBuilderDraft,
  WorkflowCanvasEdge,
  WorkflowCanvasNode,
  WorkflowDefinitionIssue,
  WorkflowNodeType,
} from "./types";

const createCanvasNodeId = () =>
  `canvas_${Math.random().toString(36).slice(2, 10)}`;
const createCanvasEdgeId = () =>
  `edge_${Math.random().toString(36).slice(2, 10)}`;

const formatDurationAmount = (value: number) => {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return String(Number(value.toFixed(2)));
};

export const buildDefaultNodeName = (
  type: WorkflowNodeType,
  channel?: WorkflowChannel | "",
) => {
  switch (type) {
    case "trigger":
      return "Test trigger";
    case "delay":
      return "Delay step";
    case "condition":
      return "Condition step";
    case "notification":
      switch (channel) {
        case "sms":
          return "SMS notification";
        case "push":
          return "Push notification";
        default:
          return "Email notification";
      }
    default:
      return "Workflow step";
  }
};

export const getNodeDisplayName = (draft: BuilderNodeDraft) =>
  draft.name.trim() || buildDefaultNodeName(draft.type, draft.channel);

export const buildNodeDescription = (draft: BuilderNodeDraft) => {
  switch (draft.type) {
    case "trigger":
      return "Starts the workflow when you test or receive the trigger event.";
    case "delay":
      return "Waits for a fixed amount of time before the next step runs.";
    case "notification":
      return "Sends a channel message using the content configured for this step.";
    case "condition":
      return "Legacy branching step retained for compatibility.";
    default:
      return "Configure the behavior for this workflow step.";
  }
};

export const hasConfiguredTemplateId = (templateId: string) => {
  const normalizedTemplateId = templateId.trim();

  return (
    normalizedTemplateId !== "" &&
    normalizedTemplateId !== zeroUUID &&
    uuidPattern.test(normalizedTemplateId)
  );
};

export const parseDelayDuration = (
  duration: string,
): { amount: string; unit: DelayUnit } => {
  const normalizedDuration = duration.trim();
  const match = normalizedDuration.match(/^(\d+(?:\.\d+)?)(s|m|h)$/);

  if (!match) {
    return {
      amount: normalizedDuration ? normalizedDuration : "",
      unit: "minutes",
    };
  }

  const amount = Number(match[1]);
  const token = match[2];

  if (token === "h") {
    if (amount >= 168 && amount % 168 === 0) {
      return { amount: formatDurationAmount(amount / 168), unit: "weeks" };
    }
    if (amount >= 24 && amount % 24 === 0) {
      return { amount: formatDurationAmount(amount / 24), unit: "days" };
    }
    return { amount: formatDurationAmount(amount), unit: "hours" };
  }

  return {
    amount: formatDurationAmount(amount),
    unit: token === "s" ? "seconds" : "minutes",
  };
};

export const formatDelayDuration = (amount: string, unit: DelayUnit) => {
  const normalizedAmount = amount.trim();
  if (!normalizedAmount) {
    return "";
  }

  const numericAmount = Number(normalizedAmount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return normalizedAmount;
  }

  switch (unit) {
    case "seconds":
      return `${formatDurationAmount(numericAmount)}s`;
    case "minutes":
      return `${formatDurationAmount(numericAmount)}m`;
    case "hours":
      return `${formatDurationAmount(numericAmount)}h`;
    case "days":
      return `${formatDurationAmount(numericAmount * 24)}h`;
    case "weeks":
      return `${formatDurationAmount(numericAmount * 168)}h`;
    default:
      return `${formatDurationAmount(numericAmount)}m`;
  }
};

const normalizeImportedTemplateId = (value: unknown) => {
  const templateId = typeof value === "string" ? value.trim() : "";

  if (!templateId) {
    return zeroUUID;
  }

  return uuidPattern.test(templateId) ? templateId : zeroUUID;
};

export const createNodeDraft = (
  type: WorkflowNodeType,
  channel?: WorkflowChannel,
): BuilderNodeDraft => {
  if (type === "trigger") {
    return {
      id: "trigger_1",
      name: buildDefaultNodeName(type),
      type,
      duration: "5m",
      templateId: "",
      channel: "",
      field: "data.plan",
      operator: "equals",
      value: "pro",
    };
  }

  return {
    id:
      type === "notification"
        ? `${channel || "email"}_${Math.random().toString(36).slice(2, 6)}`
        : `${type}_${Math.random().toString(36).slice(2, 6)}`,
    name: buildDefaultNodeName(type, channel),
    type,
    duration: "5m",
    templateId: type === "notification" ? zeroUUID : "",
    channel: type === "notification" ? channel || "email" : "",
    field: "data.plan",
    operator: "equals",
    value: "pro",
  };
};

export const normalizeNodeDraftForType = (
  draft: BuilderNodeDraft,
  type: WorkflowNodeType = draft.type,
): BuilderNodeDraft => {
  if (type === "trigger") {
    return {
      ...draft,
      name: draft.name,
      type,
      duration: "5m",
      templateId: "",
      channel: "",
      field: "data.plan",
      operator: "equals",
      value: "pro",
    };
  }

  return {
    id: draft.id,
    name: draft.name,
    type,
    duration: type === "delay" ? draft.duration : "5m",
    templateId: type === "notification" ? draft.templateId || zeroUUID : "",
    channel: type === "notification" ? draft.channel || "email" : "",
    field: type === "condition" ? draft.field || "data.plan" : "data.plan",
    operator: type === "condition" ? draft.operator || "equals" : "equals",
    value: type === "condition" ? draft.value : "pro",
  };
};

export const createDefaultWorkflowBuilderDraft = (): WorkflowBuilderDraft => ({
  triggerEvent: "user.signup",
  nodes: [
    {
      ...createNodeDraft("trigger"),
      id: "trigger_1",
      name: "Test trigger",
    },
    {
      ...createNodeDraft("delay"),
      id: "delay_1",
      name: "Wait 5 minutes",
      duration: "5m",
    },
    {
      ...createNodeDraft("notification", "email"),
      id: "email_1",
      name: "Send welcome email",
      templateId: zeroUUID,
      channel: "email",
    },
  ],
  edges: [
    { source: "trigger_1", target: "delay_1", branch: "" },
    { source: "delay_1", target: "email_1", branch: "" },
  ],
});

export const builderDraftFromDefinition = (
  definition?: WorkflowDefinition,
): WorkflowBuilderDraft => {
  if (!definition) {
    return createDefaultWorkflowBuilderDraft();
  }

  const draft: WorkflowBuilderDraft = {
    triggerEvent: definition.trigger?.event || "",
    nodes: definition.nodes.map((node) => {
      const config = (node.config || {}) as Record<string, unknown>;
      const channel =
        Array.isArray(config.channels) && typeof config.channels[0] === "string"
          ? (config.channels[0] as WorkflowChannel)
          : "";

      return normalizeNodeDraftForType(
        {
          id: node.id,
          name:
            typeof config.name === "string" && config.name.trim()
              ? config.name.trim()
              : buildDefaultNodeName(node.type, channel),
          type: node.type,
          duration:
            typeof config.duration === "string" ? config.duration : "5m",
          templateId: normalizeImportedTemplateId(config.template_id),
          channel,
          field: typeof config.field === "string" ? config.field : "data.plan",
          operator:
            typeof config.operator === "string" ? config.operator : "equals",
          value: config.value == null ? "" : String(config.value),
        },
        node.type,
      );
    }),
    edges: definition.edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      branch: edge.branch || "",
    })),
  };

  const hasTriggerNode = draft.nodes.some((node) => node.type === "trigger");
  if (!hasTriggerNode) {
    draft.nodes.unshift({ ...createNodeDraft("trigger"), id: "trigger_1" });
    const firstNonTrigger = draft.nodes.find((node) => node.type !== "trigger");
    if (firstNonTrigger) {
      draft.edges.unshift({
        source: "trigger_1",
        target: firstNonTrigger.id,
        branch: "",
      });
    }
  }

  return draft;
};

export const workflowDefinitionFromBuilderDraft = (
  draft: WorkflowBuilderDraft,
): WorkflowDefinition => {
  const nodes: WorkflowNode[] = draft.nodes.map((node) => {
    const nodeName = node.name.trim();
    const namedConfig = nodeName ? { name: nodeName } : {};
    const base = {
      id: node.id.trim(),
      type: node.type,
    } as WorkflowNode;

    switch (node.type) {
      case "trigger":
        return {
          ...base,
          config: Object.keys(namedConfig).length > 0 ? namedConfig : undefined,
        };
      case "delay":
        return {
          ...base,
          config: {
            ...namedConfig,
            duration: node.duration.trim(),
          },
        };
      case "notification":
        return {
          ...base,
          config: {
            ...namedConfig,
            template_id: node.templateId.trim(),
            channels: node.channel ? [node.channel] : [],
          },
        };
      case "condition":
        return {
          ...base,
          config: {
            ...namedConfig,
            field: node.field.trim(),
            operator: node.operator.trim(),
            value: node.value.trim(),
          },
        };
      default:
        return {
          ...base,
          config: Object.keys(namedConfig).length > 0 ? namedConfig : undefined,
        };
    }
  });

  const edges: WorkflowEdge[] = draft.edges.map((edge) => ({
    source: edge.source.trim(),
    target: edge.target.trim(),
    branch: edge.branch.trim() || undefined,
  }));

  return {
    trigger: { event: draft.triggerEvent.trim() },
    nodes,
    edges,
  };
};

export const validateWorkflowDefinitionDraft = (
  definition?: WorkflowDefinition,
): WorkflowDefinitionIssue[] => {
  if (!definition) {
    return [
      { path: "definition", message: "Workflow definition is required." },
    ];
  }

  const issues: WorkflowDefinitionIssue[] = [];
  const seenNodeIDs = new Set<string>();
  const nodePathByID = new Map<string, string>();
  const adjacency = new Map<string, string[]>();
  const incomingEdges = new Map<string, number>();
  const outgoingEdges = new Map<string, number>();
  const triggerNodeIDs = new Set<string>();

  if (!definition.trigger?.event?.trim()) {
    issues.push({
      path: "trigger.event",
      message:
        "A trigger event is still required by the current backend event API.",
    });
  }

  if (definition.nodes.length === 0) {
    issues.push({
      path: "nodes",
      message: "At least one workflow node is required.",
    });
  }

  definition.nodes.forEach((node, index) => {
    const nodePath = `nodes.${index}`;
    const nodeID = node.id.trim();
    if (!nodeID) {
      issues.push({ path: `${nodePath}.id`, message: "Node ID is required." });
      return;
    }
    if (seenNodeIDs.has(nodeID)) {
      issues.push({
        path: `${nodePath}.id`,
        message: `Duplicate node ID '${nodeID}'.`,
      });
    }
    seenNodeIDs.add(nodeID);
    nodePathByID.set(nodeID, nodePath);
    adjacency.set(nodeID, []);
    incomingEdges.set(nodeID, 0);
    outgoingEdges.set(nodeID, 0);

    if (node.type === "trigger") {
      triggerNodeIDs.add(nodeID);
    }

    const config = (node.config || {}) as Record<string, unknown>;
    if (node.type === "delay") {
      const duration =
        typeof config.duration === "string" ? config.duration.trim() : "";
      if (!durationPattern.test(duration)) {
        issues.push({
          path: `${nodePath}.duration`,
          message:
            "Delay duration must use Go duration syntax like 5m or 1h30m.",
        });
      }
    }
    if (node.type === "notification") {
      const templateID =
        typeof config.template_id === "string" ? config.template_id.trim() : "";
      const channels = Array.isArray(config.channels)
        ? config.channels.filter(
            (channel): channel is string => typeof channel === "string",
          )
        : [];
      if (
        templateID &&
        templateID !== zeroUUID &&
        !uuidPattern.test(templateID)
      ) {
        issues.push({
          path: `${nodePath}.template_id`,
          message: "Notification template ID must be a valid UUID.",
        });
      }
      if (
        channels.length !== 1 ||
        !notificationChannels.includes(channels[0] as WorkflowChannel)
      ) {
        issues.push({
          path: `${nodePath}.channels`,
          message:
            "Notification steps currently require exactly one supported channel.",
        });
      }
    }
    if (node.type === "condition") {
      issues.push({
        path: `${nodePath}.type`,
        message:
          "Condition steps are not supported in the linear workflow builder.",
      });
    }
  });

  if (triggerNodeIDs.size === 0) {
    issues.push({
      path: "nodes",
      message:
        "A workflow should start with a trigger node for testing and flow entry.",
    });
  }
  if (triggerNodeIDs.size > 1) {
    issues.push({
      path: "nodes",
      message: "Linear workflows support exactly one trigger node.",
    });
  }

  definition.edges.forEach((edge, index) => {
    const edgePath = `edges.${index}`;
    const source = edge.source.trim();
    const target = edge.target.trim();
    const branch = edge.branch?.trim() || "";
    if (!source || !target) {
      issues.push({
        path: edgePath,
        message: "Each edge must include both a source and target node.",
      });
      return;
    }
    if (!seenNodeIDs.has(source) || !seenNodeIDs.has(target)) {
      issues.push({
        path: edgePath,
        message: "Edges must point to nodes that exist in the builder.",
      });
      return;
    }
    if (branch) {
      issues.push({
        path: `${edgePath}.branch`,
        message: "Branching is not supported in the linear workflow builder.",
      });
    }
    adjacency.set(source, [...(adjacency.get(source) || []), target]);
    incomingEdges.set(target, (incomingEdges.get(target) || 0) + 1);
    outgoingEdges.set(source, (outgoingEdges.get(source) || 0) + 1);
  });

  const startNodes = Array.from(seenNodeIDs).filter(
    (nodeID) => (incomingEdges.get(nodeID) || 0) === 0,
  );

  if (seenNodeIDs.size > 0 && startNodes.length === 0) {
    issues.push({
      path: "edges",
      message:
        "Workflow graph must have one start node with no incoming edges.",
    });
  }

  if (startNodes.length > 1) {
    issues.push({
      path: "edges",
      message:
        "Linear workflows must form a single path with exactly one start node.",
    });
  }

  if (triggerNodeIDs.size === 1) {
    const triggerNodeID = Array.from(triggerNodeIDs)[0];
    if ((incomingEdges.get(triggerNodeID) || 0) > 0) {
      issues.push({
        path: `${nodePathByID.get(triggerNodeID) || "nodes"}.edges`,
        message: "The trigger node must be the first step in the workflow.",
      });
    }
  }

  for (const nodeID of seenNodeIDs) {
    const nodePath = nodePathByID.get(nodeID) || "nodes";
    const incomingCount = incomingEdges.get(nodeID) || 0;
    const outgoingCount = outgoingEdges.get(nodeID) || 0;

    if (incomingCount > 1) {
      issues.push({
        path: `${nodePath}.edges`,
        message:
          "Linear workflows allow only one incoming connection per node.",
      });
    }

    if (outgoingCount > 1) {
      issues.push({
        path: `${nodePath}.edges`,
        message:
          "Linear workflows allow only one outgoing connection per node.",
      });
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const hasCycle = (nodeID: string): boolean => {
    if (visited.has(nodeID)) {
      return false;
    }
    if (visiting.has(nodeID)) {
      return true;
    }
    visiting.add(nodeID);
    for (const next of adjacency.get(nodeID) || []) {
      if (hasCycle(next)) {
        return true;
      }
    }
    visiting.delete(nodeID);
    visited.add(nodeID);
    return false;
  };

  for (const nodeID of adjacency.keys()) {
    if (hasCycle(nodeID)) {
      issues.push({
        path: "edges",
        message: "Workflow graph cannot contain cycles.",
      });
      break;
    }
  }

  if (startNodes.length === 1) {
    const reachable = new Set<string>();
    const visit = (nodeID: string) => {
      if (reachable.has(nodeID)) {
        return;
      }

      reachable.add(nodeID);
      for (const next of adjacency.get(nodeID) || []) {
        visit(next);
      }
    };

    visit(startNodes[0]);

    if (reachable.size !== seenNodeIDs.size) {
      issues.push({
        path: "edges",
        message: "All workflow nodes must belong to one connected linear path.",
      });
    }
  }

  return issues;
};

export const getNodeTone = (type: WorkflowNodeType) => {
  switch (type) {
    case "notification":
      return "border-primary/40 bg-primary/8 text-primary";
    case "delay":
      return "border-warning/35 bg-warning/10 text-warningemphasis";
    case "condition":
      return "border-info/35 bg-info/10 text-infoemphasis";
    case "trigger":
      return "border-success/35 bg-success/10 text-successemphasis";
    default:
      return "border-border bg-muted/40 text-foreground";
  }
};

export const buildNodeSubtitle = (
  draft: BuilderNodeDraft,
  triggerEvent: string,
) => {
  switch (draft.type) {
    case "trigger":
      return triggerEvent
        ? `Event: ${triggerEvent}`
        : "Configure workflow event";
    case "delay":
      return draft.duration ? `Wait ${draft.duration}` : "Configure delay";
    case "notification":
      return hasConfiguredTemplateId(draft.templateId)
        ? `${draft.channel.toUpperCase()} content configured`
        : `${draft.channel.toUpperCase()} content needs configuration`;
    case "condition":
      return "Unsupported in linear workflows";
    default:
      return "";
  }
};

export const buildCanvasNode = (
  draft: BuilderNodeDraft,
  id = createCanvasNodeId(),
): WorkflowCanvasNode => ({
  id,
  type: "workflow-step",
  position: { x: 0, y: 0 },
  data: { draft },
});

export const buildCanvasEdge = (
  source: string,
  target: string,
  branch = "",
  id = createCanvasEdgeId(),
): WorkflowCanvasEdge => ({
  id,
  source,
  target,
  sourceHandle: "default",
  type: "workflow-edge",
  data: { branch },
});

export const layoutCanvasGraph = (
  nodes: WorkflowCanvasNode[],
  edges: WorkflowCanvasEdge[],
) => {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: "TB",
    nodesep: 40,
    ranksep: 34,
    marginx: 24,
    marginy: 24,
  });

  nodes.forEach((node) =>
    graph.setNode(node.id, { width: nodeWidth, height: nodeHeight }),
  );
  edges.forEach((edge) => graph.setEdge(edge.source, edge.target));
  dagre.layout(graph);

  return {
    nodes: nodes.map((node) => {
      const positioned = graph.node(node.id);
      return {
        ...node,
        position: positioned
          ? {
              x: positioned.x - nodeWidth / 2,
              y: positioned.y - nodeHeight / 2,
            }
          : node.position,
      };
    }),
    edges,
  };
};

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

export const buildDraftFromCanvas = (
  triggerEvent: string,
  nodes: WorkflowCanvasNode[],
  edges: WorkflowCanvasEdge[],
): WorkflowBuilderDraft => {
  const orderedNodes = [...nodes].sort((left, right) => {
    if (left.position.y !== right.position.y) {
      return left.position.y - right.position.y;
    }
    return left.position.x - right.position.x;
  });
  const nodeDraftById = new Map(
    orderedNodes.map((node) => [node.id, node.data.draft]),
  );

  const draft = {
    triggerEvent,
    nodes: orderedNodes.map((node) => ({ ...node.data.draft })),
    edges: edges.map((edge) => ({
      source: nodeDraftById.get(edge.source)?.id || "",
      target: nodeDraftById.get(edge.target)?.id || "",
      branch: edge.data?.branch || "",
    })),
  };

  draft.nodes.sort((left, right) => {
    if (left.type === "trigger" && right.type !== "trigger") {
      return -1;
    }
    if (left.type !== "trigger" && right.type === "trigger") {
      return 1;
    }
    return 0;
  });

  return draft;
};
