'use client';

import type { JSONContent } from '@tiptap/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { workflowApi } from '../api';
import { zeroUUID } from '../constants';
import type { TemplateUpdatePayload } from '../types/api';
import type { CreateTemplatePayload } from '@/app/types/template';
import type {
  WorkflowChannel,
  WorkflowDefinition,
  WorkflowItem,
  WorkflowNode,
} from '@/app/types/workflow';

export type ChannelConfigState = {
  loading: boolean;
  error: string | null;
  workflow: WorkflowItem | null;
  node: WorkflowNode | null;
  channel: WorkflowChannel;
  templateId: string;
  subject: string;
  body: string;
  contentJson: JSONContent | null;
  autosaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  payload: string;
};

export type ChannelConfigActions = {
  setSubject: (subject: string) => void;
  setBody: (body: string) => void;
  handleHtmlChange: (html: string, json?: JSONContent | null) => void;
  setPayload: (payload: string) => void;
};

export type ChannelConfigResult = ChannelConfigState & ChannelConfigActions;

const getNodeDisplayName = (
  node: WorkflowNode | null,
  fallbackNodeId: string,
) => {
  const config = node?.config || {};
  if (typeof config.name === 'string' && config.name.trim()) {
    return config.name.trim();
  }
  return node?.id || fallbackNodeId;
};

export const useChannelConfig = (
  workflowId: string,
  nodeId: string,
): ChannelConfigResult => {
  const templateIdRef = useRef<string>('');
  const workflowRef = useRef<WorkflowItem | null>(null);
  const nodeRef = useRef<WorkflowNode | null>(null);
  const channelRef = useRef<WorkflowChannel>('email');
  const subjectRef = useRef<string>('');
  const encodedBodyRef = useRef<string>('');
  const payloadRef = useRef<string>('');
  const nodeNameRef = useRef<string>('');
  const queryClient = useQueryClient();
  const bodyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const subjectDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [loading, setLoading] = useState(true);
  const [autosaveStatus, setAutosaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');
  const [error, setError] = useState<string | null>(null);
  const [workflow, setWorkflow] = useState<WorkflowItem | null>(null);
  const [node, setNode] = useState<WorkflowNode | null>(null);
  const [channel, setChannel] = useState<WorkflowChannel>('email');
  const [templateId, setTemplateId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [contentJson, setContentJson] = useState<JSONContent | null>(null);
  const [payload, setPayload] = useState('{}');

  useEffect(() => {
    subjectRef.current = subject;
  }, [subject]);

  useEffect(() => {
    payloadRef.current = payload;
  }, [payload]);

  const performAutosave = useCallback(
    async (html: string) => {
      const currentWorkflow = workflowRef.current;
      const currentNode = nodeRef.current;
      const currentChannel = channelRef.current;
      const currentSubject = subjectRef.current;
      const currentTemplateId = templateIdRef.current;
      const currentName = nodeNameRef.current;

      if (!currentWorkflow || !currentNode) return;

      setAutosaveStatus('saving');
      try {
        const templatePayload: CreateTemplatePayload = {
          name: `${currentWorkflow.name} ${currentName} ${currentChannel}`,
          channel: currentChannel,
          body: html,
          subject:
            currentChannel === 'sms'
              ? undefined
              : currentSubject.trim() || undefined,
        };

        let savedTemplateId = currentTemplateId;
        if (currentTemplateId && currentTemplateId !== zeroUUID) {
          const updated = await workflowApi.updateTemplate(currentTemplateId, {
            body: templatePayload.body,
            subject: templatePayload.subject,
          } satisfies TemplateUpdatePayload);
          savedTemplateId = updated.id;
        } else {
          const created = await workflowApi.upsertTemplate(templatePayload);
          savedTemplateId = created.id;
          setTemplateId(savedTemplateId);
          templateIdRef.current = savedTemplateId;
        }

        // Build definition with template_id + payload in one pass
        const currentDef = workflowRef.current?.definition;
        const rawPayload = payloadRef.current;
        let parsedPayload: Record<string, unknown> | undefined;
        if (rawPayload) {
          try {
            parsedPayload = JSON.parse(rawPayload) as Record<string, unknown>;
          } catch {
            parsedPayload = undefined;
          }
        }

        const updatedDefinition: WorkflowDefinition = {
          trigger: currentDef?.trigger || { event: '' },
          nodes: (currentDef?.nodes || []).map((n) =>
            n.id === currentNode.id
              ? {
                  ...n,
                  config: {
                    ...n.config,
                    template_id: savedTemplateId,
                    channels: [currentChannel],
                  },
                }
              : n,
          ),
          edges: currentDef?.edges || [],
          ...(parsedPayload ? { payload: parsedPayload } : {}),
        };

        await workflowApi.updateWorkflow(currentWorkflow.id, {
          key: currentWorkflow.key,
          name: currentWorkflow.name,
          description: currentWorkflow.description || undefined,
          definition: updatedDefinition,
        });

        void queryClient.invalidateQueries({
          queryKey: ['workflow', currentWorkflow.id],
        });

        setAutosaveStatus('saved');
      } catch (err) {
        console.error('Autosave failed:', err);
        setAutosaveStatus('error');
      }
    },
    [nodeId],
  );

  // Autosave on HTML content change (from Maily editor)
  const handleHtmlChange = useCallback(
    (html: string, json?: JSONContent | null) => {
      setBody(html);
      if (json) setContentJson(json);
      encodedBodyRef.current = html;
      if (bodyDebounceRef.current) clearTimeout(bodyDebounceRef.current);
      bodyDebounceRef.current = setTimeout(() => {
        void performAutosave(html);
      }, 1500);
    },
    [performAutosave],
  );

  // Autosave on subject change
  const handleSubjectChange = useCallback(
    (value: string) => {
      setSubject(value);
      if (subjectDebounceRef.current) clearTimeout(subjectDebounceRef.current);
      subjectDebounceRef.current = setTimeout(() => {
        const lastBody = encodedBodyRef.current;
        if (lastBody) {
          void performAutosave(lastBody);
        }
      }, 1500);
    },
    [performAutosave],
  );

  // Load initial data
  useEffect(() => {
    if (!workflowId || !nodeId) {
      setError('Workflow or channel node was not provided');
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const nextWorkflow = await workflowApi.getWorkflow(workflowId);
        if (cancelled) return;

        const definition = nextWorkflow.definition;
        const nextNode =
          definition?.nodes.find((item) => item.id === nodeId) || null;
        if (!nextNode || nextNode.type !== 'notification') {
          throw new Error('Notification node not found');
        }

        const config = nextNode.config || {};
        const nextChannel =
          Array.isArray(config.channels) &&
          typeof config.channels[0] === 'string'
            ? (config.channels[0] as WorkflowChannel)
            : 'email';
        const nextTemplateId =
          typeof config.template_id === 'string' ? config.template_id : '';

        setWorkflow(nextWorkflow);
        setNode(nextNode);
        setChannel(nextChannel);
        setTemplateId(nextTemplateId);
        workflowRef.current = nextWorkflow;
        nodeRef.current = nextNode;
        channelRef.current = nextChannel;
        templateIdRef.current = nextTemplateId;
        nodeNameRef.current = getNodeDisplayName(nextNode, nodeId);

        if (nextTemplateId && nextTemplateId !== zeroUUID) {
          const template = await workflowApi.getTemplate(nextTemplateId);
          if (!cancelled) {
            setSubject(template.subject || '');
            setBody(template.body || '');
          }
        } else {
          setSubject('');
          setBody('');
        }

        // Load payload from definition if present
        const currentDefinition = nextWorkflow.definition;
        const payloadRaw = currentDefinition?.payload;
        if (payloadRaw) {
          setPayload(
            typeof payloadRaw === 'string'
              ? payloadRaw
              : JSON.stringify(payloadRaw, null, 2),
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load channel editor',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
      if (bodyDebounceRef.current) clearTimeout(bodyDebounceRef.current);
      if (subjectDebounceRef.current) clearTimeout(subjectDebounceRef.current);
    };
  }, [nodeId, workflowId]);

  return {
    loading,
    error,
    workflow,
    node,
    channel,
    templateId,
    subject,
    body,
    contentJson,
    payload,
    autosaveStatus,
    setSubject: handleSubjectChange,
    setBody,
    setPayload,
    handleHtmlChange,
  };
};
