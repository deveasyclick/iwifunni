import type { WorkflowChannel } from '@/app/types/workflow';
import type { DelayUnit } from '../utils/duration/types';

export const notificationChannels: WorkflowChannel[] = ['email', 'sms', 'push'];
export const delayUnits: DelayUnit[] = [
  'seconds',
  'minutes',
  'hours',
  'days',
  'weeks',
];
export const conditionOperators = [
  'equals',
  'not_equals',
  'contains',
  'exists',
];
export const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const durationPattern = /^(\d+(?:\.\d+)?(?:ns|us|µs|ms|s|m|h))+$/;
export const zeroUUID = '00000000-0000-0000-0000-000000000000';
export const nodeWidth = 288;
export const nodeHeight = 156;

export const DEFAULT_SENDER_NAME = 'Yusuf';
export const DEFAULT_SENDER_EMAIL = 'yusuf@eayclick.com';
