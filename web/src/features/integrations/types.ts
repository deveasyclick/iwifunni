import type { ProviderItem } from '@/app/types/provider';

export type FieldDefinition = {
  key: string;
  label: string;
  placeholder: string;
  type?: 'text' | 'password' | 'number';
  sourceKey?: string;
  location: 'credentials' | 'config';
};

export type ProviderDefinition = {
  key: string;
  label: string;
  channel: 'email' | 'sms' | 'push';
  icon: string;
  description: string;
  credentials: FieldDefinition[];
  config: FieldDefinition[];
};

export type ProviderCard = {
  definition: ProviderDefinition;
  item: ProviderItem | null;
  fallbackExists: boolean;
};
