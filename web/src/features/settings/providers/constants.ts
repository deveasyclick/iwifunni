import type { ProviderDefinition } from './types';

export const SUPPORTED_PROVIDERS: ProviderDefinition[] = [
  {
    key: 'sendgrid',
    label: 'SendGrid',
    channel: 'email',
    icon: 'simple-icons:sendgrid',
    description: 'Transactional email via SendGrid API.',
    credentials: [
      {
        key: 'api_key',
        label: 'API key',
        placeholder: 'SG.xxxxx',
        type: 'password',
        location: 'credentials',
      },
    ],
    config: [
      {
        key: 'sender_name',
        label: 'Sender name',
        placeholder: 'My App',
        location: 'config',
      },
      {
        key: 'from_email',
        label: 'Sender email',
        placeholder: 'no-reply@example.com',
        location: 'config',
      },
    ],
  },
  {
    key: 'brevo',
    label: 'Brevo',
    channel: 'email',
    icon: 'simple-icons:brevo',
    description: 'Brevo SMTP relay with a verified sender address.',
    credentials: [
      {
        key: 'api_key',
        label: 'API key',
        placeholder: 'xkeysib-xxxxx',
        type: 'password',
        location: 'credentials',
      },
    ],
    config: [
      {
        key: 'sender_name',
        label: 'Sender name',
        placeholder: 'My App',
        location: 'config',
      },
      {
        key: 'from_email',
        sourceKey: 'from',
        label: 'Sender email',
        placeholder: 'no-reply@example.com',
        location: 'config',
      },
    ],
  },
  {
    key: 'smtp',
    label: 'SMTP',
    channel: 'email',
    icon: 'mdi:email-fast-outline',
    description: 'Custom SMTP relay for email delivery.',
    credentials: [
      {
        key: 'username',
        label: 'Username',
        placeholder: 'smtp-user',
        location: 'credentials',
      },
      {
        key: 'password',
        label: 'Password',
        placeholder: 'smtp-password',
        type: 'password',
        location: 'credentials',
      },
    ],
    config: [
      {
        key: 'host',
        label: 'Host',
        placeholder: 'smtp.example.com',
        location: 'config',
      },
      {
        key: 'port',
        label: 'Port',
        placeholder: '587',
        type: 'number',
        location: 'config',
      },
      {
        key: 'sender_name',
        label: 'Sender name',
        placeholder: 'My App',
        location: 'config',
      },
      {
        key: 'from_email',
        sourceKey: 'from',
        label: 'Sender email',
        placeholder: 'no-reply@example.com',
        location: 'config',
      },
    ],
  },
  {
    key: 'termii',
    label: 'Termii',
    channel: 'sms',
    icon: 'mdi:message-text-fast-outline',
    description: 'SMS delivery using Termii sender credentials.',
    credentials: [
      {
        key: 'api_key',
        label: 'API key',
        placeholder: 'termii-api-key',
        type: 'password',
        location: 'credentials',
      },
    ],
    config: [
      {
        key: 'sender_id',
        label: 'Sender ID',
        placeholder: 'IWIFUNNI',
        location: 'config',
      },
    ],
  },
  {
    key: 'twilio',
    label: 'Twilio',
    channel: 'sms',
    icon: 'simple-icons:twilio',
    description: 'SMS delivery with Twilio account credentials.',
    credentials: [
      {
        key: 'account_sid',
        label: 'Account SID',
        placeholder: 'ACxxxxxxxx',
        location: 'credentials',
      },
      {
        key: 'auth_token',
        label: 'Auth token',
        placeholder: 'twilio-auth-token',
        type: 'password',
        location: 'credentials',
      },
    ],
    config: [
      {
        key: 'from_number',
        sourceKey: 'sender_id',
        label: 'From number',
        placeholder: '+1234567890',
        location: 'config',
      },
    ],
  },
  {
    key: 'fcm',
    label: 'FCM',
    channel: 'push',
    icon: 'logos:firebase',
    description: 'Push delivery using Firebase Cloud Messaging.',
    credentials: [
      {
        key: 'server_key',
        label: 'Server key',
        placeholder: 'fcm-server-key',
        type: 'password',
        location: 'credentials',
      },
    ],
    config: [],
  },
  {
    key: 'webpush',
    label: 'Web Push',
    channel: 'push',
    icon: 'mdi:web',
    description: 'Browser push delivery with VAPID keys.',
    credentials: [
      {
        key: 'public_key',
        label: 'Public key',
        placeholder: 'web-push-public-key',
        location: 'credentials',
      },
      {
        key: 'private_key',
        label: 'Private key',
        placeholder: 'web-push-private-key',
        type: 'password',
        location: 'credentials',
      },
    ],
    config: [],
  },
  {
    key: 'demo-email',
    label: 'Demo Email',
    channel: 'email',
    icon: 'mdi:email-check-outline',
    description:
      'Safe sandbox — delivers emails to your own account address automatically.',
    credentials: [],
    config: [],
  },
  {
    key: 'demo-sms',
    label: 'Demo SMS',
    channel: 'sms',
    icon: 'mdi:message-check-outline',
    description:
      "Safe sandbox — logs SMS to the subscriber's own number without sending.",
    credentials: [],
    config: [],
  },
];

export const CHANNEL_GROUPS: {
  channel: 'email' | 'sms' | 'push';
  label: string;
  icon: string;
}[] = [
  { channel: 'email', label: 'Email', icon: 'mdi:email-outline' },
  { channel: 'sms', label: 'SMS', icon: 'mdi:message-text-outline' },
  { channel: 'push', label: 'Push', icon: 'mdi:bell-outline' },
];
