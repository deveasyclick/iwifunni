import { describe, expect, it } from 'vitest';
import { builderDraftFromDefinition } from './from-definition';
import { workflowDefinitionFromBuilderDraft } from './to-definition';
import { buildDraftFromCanvas } from './from-canvas';
import { buildCanvasGraphFromDraft } from '@/features/workflows/utils/canvas';
import { validateNodes } from '@/features/workflows/utils/validation/nodes';
import type { WorkflowDefinition, WorkflowNode } from '@/app/types/workflow';

// ─── builderDraftFromDefinition + workflowDefinitionFromBuilderDraft roundtrip ─

describe('draft roundtrip preserves template_id', () => {
  const templateId = '550e8400-e29b-41d4-a716-446655440000';

  function makeDef(
    nodes: WorkflowNode[],
    edges?: { source: string; target: string }[],
  ): WorkflowDefinition {
    return {
      trigger: { event: 'user.signup' },
      nodes,
      edges: edges || [],
    };
  }

  function makeNotificationNode(
    id: string,
    channel: string,
    template_id?: string,
  ): WorkflowNode {
    const config: Record<string, unknown> = { channels: [channel] };
    if (template_id !== undefined) config.template_id = template_id;
    return { id, type: 'notification', config };
  }

  function makeDelayNode(id: string): WorkflowNode {
    return { id, type: 'delay', config: { duration: '5m' } };
  }

  it('preserves template_id through builderDraftFromDefinition → workflowDefinitionFromBuilderDraft', () => {
    const def = makeDef(
      [
        makeDelayNode('delay_1'),
        makeNotificationNode('email_1', 'email', templateId),
      ],
      [{ source: 'delay_1', target: 'email_1' }],
    );

    const draft = builderDraftFromDefinition(def);
    const notificationNode = draft.nodes.find((n) => n.id === 'email_1');
    expect(notificationNode).toBeDefined();
    expect(notificationNode!.templateId).toBe(templateId);

    const backToDef = workflowDefinitionFromBuilderDraft(draft);
    const backNode = backToDef.nodes.find((n) => n.id === 'email_1');
    expect(backNode).toBeDefined();
    expect(backNode!.config?.template_id).toBe(templateId);
  });

  it('handles empty template_id', () => {
    const def = makeDef([makeNotificationNode('email_1', 'email', '')]);

    const draft = builderDraftFromDefinition(def);
    const notificationNode = draft.nodes.find((n) => n.id === 'email_1');
    expect(notificationNode).toBeDefined();
    expect(notificationNode!.templateId).toBe('');

    const backToDef = workflowDefinitionFromBuilderDraft(draft);
    const backNode = backToDef.nodes.find((n) => n.id === 'email_1');
    expect(backNode).toBeDefined();
    expect(backNode!.config?.template_id).toBe('');
  });

  it('handles missing template_id field', () => {
    const def = makeDef([makeNotificationNode('email_1', 'email')]);

    const draft = builderDraftFromDefinition(def);
    const notificationNode = draft.nodes.find((n) => n.id === 'email_1');
    expect(notificationNode).toBeDefined();
    expect(notificationNode!.templateId).toBe('');

    const backToDef = workflowDefinitionFromBuilderDraft(draft);
    const backNode = backToDef.nodes.find((n) => n.id === 'email_1');
    expect(backNode).toBeDefined();
    expect(backNode!.config?.template_id).toBe('');
  });

  it('preserves template_id with multiple notification nodes', () => {
    const emailId = '550e8400-e29b-41d4-a716-446655440000';
    const smsId = '660e8400-e29b-41d4-a716-446655440001';

    const def = makeDef(
      [
        makeNotificationNode('email_1', 'email', emailId),
        makeNotificationNode('sms_1', 'sms', smsId),
      ],
      [{ source: 'email_1', target: 'sms_1' }],
    );

    const draft = builderDraftFromDefinition(def);
    const emailNode = draft.nodes.find((n) => n.id === 'email_1');
    const smsNode = draft.nodes.find((n) => n.id === 'sms_1');
    expect(emailNode!.templateId).toBe(emailId);
    expect(smsNode!.templateId).toBe(smsId);

    const backToDef = workflowDefinitionFromBuilderDraft(draft);
    expect(
      backToDef.nodes.find((n) => n.id === 'email_1')!.config?.template_id,
    ).toBe(emailId);
    expect(
      backToDef.nodes.find((n) => n.id === 'sms_1')!.config?.template_id,
    ).toBe(smsId);
  });
});

// ─── buildDraftFromCanvas preserves template_id ────────────────────────────

describe('buildDraftFromCanvas preserves template_id', () => {
  const templateId = '550e8400-e29b-41d4-a716-446655440000';

  it('preserves template_id when converting canvas back to draft', () => {
    const def: WorkflowDefinition = {
      trigger: { event: 'test.event' },
      nodes: [
        {
          id: 'trigger_1',
          type: 'trigger',
          config: {},
        },
        {
          id: 'email_1',
          type: 'notification',
          config: {
            template_id: templateId,
            channels: ['email'],
          },
        },
      ],
      edges: [{ source: 'trigger_1', target: 'email_1' }],
    };

    // Simulate the store roundtrip: definition → draft → canvas → draft
    const draft = builderDraftFromDefinition(def);
    const graph = buildCanvasGraphFromDraft(draft);
    const canvasDraft = buildDraftFromCanvas(
      draft.triggerEvent,
      graph.nodes,
      graph.edges,
    );

    const canvasNode = canvasDraft.nodes.find((n) => n.id === 'email_1');
    expect(canvasNode).toBeDefined();
    expect(canvasNode!.templateId).toBe(templateId);
  });

  it('roundtrips template_id through full canvas cycle', () => {
    const def: WorkflowDefinition = {
      trigger: { event: 'test.event' },
      nodes: [
        {
          id: 'trigger_1',
          type: 'trigger',
          config: {},
        },
        {
          id: 'email_1',
          type: 'notification',
          config: {
            template_id: templateId,
            channels: ['email'],
          },
        },
      ],
      edges: [{ source: 'trigger_1', target: 'email_1' }],
    };

    // Full cycle: def → draft → canvas → draft → def
    const draft = builderDraftFromDefinition(def);
    const graph = buildCanvasGraphFromDraft(draft);
    const canvasDraft = buildDraftFromCanvas(
      draft.triggerEvent,
      graph.nodes,
      graph.edges,
    );
    const finalDef = workflowDefinitionFromBuilderDraft(canvasDraft);

    const finalNode = finalDef.nodes.find((n) => n.id === 'email_1');
    expect(finalNode).toBeDefined();
    expect(finalNode!.config?.template_id).toBe(templateId);
  });
});

// ─── Validate workflow nodes with/without template_id ──────────────────────

describe('validateNodes template_id checks', () => {
  it('shows no issue when template_id is a valid UUID', () => {
    const def: WorkflowDefinition = {
      trigger: { event: 'test.event' },
      nodes: [
        {
          id: 'email_1',
          type: 'notification',
          config: {
            template_id: '550e8400-e29b-41d4-a716-446655440000',
            channels: ['email'],
          },
        },
      ],
      edges: [],
    };

    const issues = validateNodes(def);
    const templateIssues = issues.filter((i: { path: string }) =>
      i.path.includes('template_id'),
    );
    expect(templateIssues).toHaveLength(0);
  });

  it('shows no issue when template_id is a zero UUID', () => {
    const def: WorkflowDefinition = {
      trigger: { event: 'test.event' },
      nodes: [
        {
          id: 'email_1',
          type: 'notification',
          config: {
            template_id: '00000000-0000-0000-0000-000000000000',
            channels: ['email'],
          },
        },
      ],
      edges: [],
    };

    const issues = validateNodes(def);
    const templateIssue = issues.find((i: { path: string }) =>
      i.path.includes('template_id'),
    );
    expect(templateIssue?.message).toContain('no configured template');
  });

  it('shows "no configured template" when template_id is empty', () => {
    const def: WorkflowDefinition = {
      trigger: { event: 'test.event' },
      nodes: [
        {
          id: 'email_1',
          type: 'notification',
          config: {
            template_id: '',
            channels: ['email'],
          },
        },
      ],
      edges: [],
    };

    const issues = validateNodes(def);
    const templateIssue = issues.find((i: { path: string }) =>
      i.path.includes('template_id'),
    );
    expect(templateIssue).toBeDefined();
    expect(templateIssue!.message).toContain('no configured template');
  });

  it('shows "no configured template" when template_id is missing', () => {
    const def: WorkflowDefinition = {
      trigger: { event: 'test.event' },
      nodes: [
        {
          id: 'email_1',
          type: 'notification',
          config: {
            channels: ['email'],
          },
        },
      ],
      edges: [],
    };

    const issues = validateNodes(def);
    const templateIssue = issues.find((i: { path: string }) =>
      i.path.includes('template_id'),
    );
    expect(templateIssue).toBeDefined();
    expect(templateIssue!.message).toContain('no configured template');
  });
});
