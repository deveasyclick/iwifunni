import type { DelayUnit } from './types';

const formatDurationAmount = (value: number) => {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return String(Number(value.toFixed(2)));
};

export { formatDurationAmount };

export const parseDelayDuration = (
  duration: string,
): { amount: string; unit: DelayUnit } => {
  const normalizedDuration = duration.trim();
  const match = normalizedDuration.match(/^(\d+(?:\.\d+)?)(s|m|h)$/);

  if (!match) {
    return {
      amount: normalizedDuration ? normalizedDuration : '',
      unit: 'minutes',
    };
  }

  const amount = Number(match[1]);
  const token = match[2];

  if (token === 'h') {
    if (amount >= 168 && amount % 168 === 0) {
      return { amount: formatDurationAmount(amount / 168), unit: 'weeks' };
    }
    if (amount >= 24 && amount % 24 === 0) {
      return { amount: formatDurationAmount(amount / 24), unit: 'days' };
    }
    return { amount: formatDurationAmount(amount), unit: 'hours' };
  }

  return {
    amount: formatDurationAmount(amount),
    unit: token === 's' ? 'seconds' : 'minutes',
  };
};
