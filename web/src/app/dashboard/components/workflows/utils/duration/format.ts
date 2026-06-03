import type { DelayUnit } from './types';
import { formatDurationAmount } from './parse';

export const formatDelayDuration = (amount: string, unit: DelayUnit) => {
  const normalizedAmount = amount.trim();
  if (!normalizedAmount) {
    return '';
  }

  const numericAmount = Number(normalizedAmount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return normalizedAmount;
  }

  switch (unit) {
    case 'seconds':
      return `${formatDurationAmount(numericAmount)}s`;
    case 'minutes':
      return `${formatDurationAmount(numericAmount)}m`;
    case 'hours':
      return `${formatDurationAmount(numericAmount)}h`;
    case 'days':
      return `${formatDurationAmount(numericAmount * 24)}h`;
    case 'weeks':
      return `${formatDurationAmount(numericAmount * 168)}h`;
    default:
      return `${formatDurationAmount(numericAmount)}m`;
  }
};
