import type { VariableGroup } from '../types/data-panel';

/**
 * Static variable definitions for the Data panel and editor autocomplete.
 * These are the same for every workflow — just labels and descriptions.
 * If per-workflow dynamic metadata is needed later, it can be merged in.
 */
export const DEFAULT_VARIABLE_GROUPS: VariableGroup[] = [
  {
    id: 'subscriber',
    label: 'Subscriber',
    variables: [
      {
        path: 'subscriber.id',
        label: 'Subscriber ID',
        type: 'string',
        description: 'Unique subscriber identifier',
      },
      {
        path: 'subscriber.firstName',
        label: 'First Name',
        type: 'string',
        description: 'Subscriber first name',
      },
      {
        path: 'subscriber.lastName',
        label: 'Last Name',
        type: 'string',
        description: 'Subscriber last name',
      },
      {
        path: 'subscriber.email',
        label: 'Email',
        type: 'string',
        description: 'Subscriber email address',
      },
      {
        path: 'subscriber.phone',
        label: 'Phone',
        type: 'string',
        description: 'Subscriber phone number',
      },
      {
        path: 'subscriber.name',
        label: 'Full Name',
        type: 'string',
        description: 'Subscriber full display name',
      },
      {
        path: 'subscriber.tags',
        label: 'Tags',
        type: 'array',
        description: 'Subscriber tags',
      },
    ],
  },
  {
    id: 'workflow',
    label: 'Workflow',
    variables: [
      {
        path: 'workflow.id',
        label: 'Workflow ID',
        type: 'string',
        description: 'Workflow unique identifier',
      },
      {
        path: 'workflow.key',
        label: 'Workflow Key',
        type: 'string',
        description: 'Workflow unique key',
      },
      {
        path: 'workflow.name',
        label: 'Workflow Name',
        type: 'string',
        description: 'Workflow display name',
      },
    ],
  },
];
