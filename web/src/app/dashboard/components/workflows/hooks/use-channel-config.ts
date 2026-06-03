'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { workflowApi } from '../api';
import { zeroUUID } from '../constants';
import type { TemplateUpdatePayload } from '../types/api';
import type { CreateTemplatePayload, TemplateItem } from '@/app/types/template';
import type {
  WorkflowChannel,
  WorkflowDefinition,
  WorkflowItem,
  WorkflowNode,
} from '@/app/types/workflow';

export type ChannelConfigState = {
  loading: boolean;
  saving: boolean;
  error: string | null;
  workflow: WorkflowItem | null;
  node: WorkflowNode | null;
  channel: WorkflowChannel;
  templateId: string;
  subject: string;
  body: string;
  emailPreviewHtml: string;
  autosaveStatus: 'idle' | 'saving' | 'saved' | 'error';
};

export type ChannelConfigActions = {
  setSubject: (subject: string) => void;
  setBody: (body: string) => void;
  setEmailPreviewHtml: (html: string) => void;
  handleEncodedBodyChange: (encodedBody: string) => void;
  saveChannelConfiguration: () => Promise<void>;
};

export type ChannelConfigResult = ChannelConfigState & ChannelConfigActions;

export const useChannelConfig = (
  workflowId: string,
  nodeId: string,
  getNodeName: (node: WorkflowNode | null, fallbackNodeId: string) => string,
): ChannelConfigResult => {
  const emailEditorRef = useRef<{
    getEncodedBody: () => Promise<string>;
  } | null>(null);
  const templateIdRef = useRef<string>('');
  const workflowRef = useRef<WorkflowItem | null>(null);
  const nodeRef = useRef<WorkflowNode | null>(null);
  const channelRef = useRef<WorkflowChannel>('email');
  const subjectRef = useRef<string>('');
  const autosaveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
  const [emailPreviewHtml, setEmailPreviewHtml] = useState('');

  // Keep refs in sync with state for autosave
  useEffect(() => {
    subjectRef.current = subject;
  }, [subject]);

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
    };
  }, [nodeId, workflowId]);

  const performAutosave = useCallback(
    async (encodedBody: string) => {
      const currentWorkflow = workflowRef.current;
      const currentNode = nodeRef.current;
      const currentChannel = channelRef.current;
      const currentSubject = subjectRef.current;
      const currentTemplateId = templateIdRef.current;

      if (!currentWorkflow || !currentNode) return;

      setAutosaveStatus('saving');
      try {
        const templatePayload: CreateTemplatePayload = {
          name: `${currentWorkflow.name} ${getNodeName(currentNode, nodeId)} ${currentChannel}`,
          channel: currentChannel,
          body: encodedBody,
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
          const created = await workflowApi.createTemplate(templatePayload);
          savedTemplateId = created.id;
          setTemplateId(savedTemplateId);
          templateIdRef.current = savedTemplateId;

          const currentDefinition =
            currentWorkflow.definition as WorkflowDefinition;
          const nextDefinition: WorkflowDefinition = {
            ...currentDefinition,
            nodes: currentDefinition.nodes.map((definitionNode) =>
              definitionNode.id !== currentNode.id
                ? definitionNode
                : {
                    ...definitionNode,
                    config: {
                      ...(definitionNode.config || {}),
                      template_id: savedTemplateId,
                      channels: [currentChannel],
                    },
                  },
            ),
          };
          await workflowApi.updateWorkflow(currentWorkflow.id, {
            key: currentWorkflow.key,
            name: currentWorkflow.name,
            description: currentWorkflow.description || undefined,
            definition: nextDefinition,
          });
        }

        setAutosaveStatus('saved');
      } catch {
        setAutosaveStatus('error');
      }
    },
    [getNodeName, nodeId],
  );

  const handleEncodedBodyChange = useCallback(
    (encodedBody: string) => {
      if (autosaveDebounceRef.current)
        clearTimeout(autosaveDebounceRef.current);
      autosaveDebounceRef.current = setTimeout(() => {
        void performAutosave(encodedBody);
      }, 1500);
    },
    [performAutosave],
  );

  const saveChannelConfiguration = useCallback(async () => {
    if (!workflow || !node) {
      setError('Workflow draft is not ready');
      return;
    }

    let resolvedBody = body;
    if (channel === 'email') {
      if (!emailEditorRef.current) {
        setError('Email editor is not ready');
        return;
      }
      resolvedBody = await emailEditorRef.current.getEncodedBody();
    } else if (!body.trim()) {
      setError(`${channel === 'sms' ? 'SMS body' : 'Email body'} is required`);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const templatePayload: CreateTemplatePayload = {
        name: `${workflow.name} ${getNodeName(node, nodeId)} ${channel}`,
        channel,
        body: resolvedBody,
        subject: channel === 'sms' ? undefined : subject.trim() || undefined,
      };

      let savedTemplateId = templateId;
      if (templateId && templateId !== zeroUUID) {
        const updatedTemplate = await workflowApi.updateTemplate(templateId, {
          body: templatePayload.body,
          subject: templatePayload.subject,
        } satisfies TemplateUpdatePayload);
        savedTemplateId = updatedTemplate.id;
      } else {
        const createdTemplate =
          await workflowApi.createTemplate(templatePayload);
        savedTemplateId = createdTemplate.id;
      }

      const currentDefinition = workflow.definition as WorkflowDefinition;
      const nextDefinition: WorkflowDefinition = {
        ...currentDefinition,
        nodes: currentDefinition.nodes.map((definitionNode) => {
          if (definitionNode.id !== node.id) {
            return definitionNode;
          }

          return {
            ...definitionNode,
            config: {
              ...(definitionNode.config || {}),
              template_id: savedTemplateId,
              channels: [channel],
            },
          };
        }),
      };

      await workflowApi.updateWorkflow(workflow.id, {
        key: workflow.key,
        name: workflow.name,
        description: workflow.description || undefined,
        definition: nextDefinition,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to save channel configuration',
      );
    } finally {
      setSaving(false);
    }
  }, [body, channel, getNodeName, node, nodeId, subject, templateId, workflow]);

  return {
    // State
    loading,
    saving,
    error,
    workflow,
    node,
    channel,
    templateId,
    subject,
    body,
    emailPreviewHtml,
    autosaveStatus,
    // Actions
    setSubject,
    setBody,
    setEmailPreviewHtml,
    handleEncodedBodyChange,
    saveChannelConfiguration,
  };
};
