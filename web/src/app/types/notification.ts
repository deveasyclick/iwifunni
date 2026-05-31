export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

export interface JsonObject {
	[key: string]: JsonValue;
}

export type NotificationChannel = "email" | "sms" | "push";

export type NotificationStatus =
	| "queued"
	| "processing"
	| "pending"
	| "sent"
	| "failed"
	| "delivered"
	| "partial_failed";

export interface NotificationType {
	id: string;
	service_id?: string;
	user_id?: string;
	title: string;
	message: string;
	channels: NotificationChannel[];
	metadata: JsonObject;
	status: NotificationStatus;
	retry_count?: number;
	created_at: Date | string;
	updated_at: Date | string;
	environment_id?: string;
}
