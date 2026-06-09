import { format } from 'date-fns';

export const formatCreatedAt = (value?: string): string => {
  if (!value) return '-';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';

  return format(parsed, 'MMM d, yyyy');
};
