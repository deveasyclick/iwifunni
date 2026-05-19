import type { WorkflowChannel } from "@/app/types/workflow";

export const notificationChannels: WorkflowChannel[] = ["email", "sms", "push"];
export const conditionOperators = [
  "equals",
  "not_equals",
  "contains",
  "exists",
];
export const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const durationPattern = /^(\d+(?:\.\d+)?(?:ns|us|µs|ms|s|m|h))+$/;
export const zeroUUID = "00000000-0000-0000-0000-000000000000";
export const nodeWidth = 288;
export const nodeHeight = 156;
