/**
 * Formats a sender name and email into a "Name <email>" string.
 */
export function formatSenderLine(
  senderName: string | undefined,
  senderEmail: string | undefined,
): string {
  if (senderName && senderEmail) return `${senderName} <${senderEmail}>`;
  return '';
}

/**
 * Gets the initial letter from a sender name, defaulting to "?".
 */
export function getSenderInitial(senderName: string | undefined): string {
  return (senderName || '?')[0].toUpperCase();
}

/**
 * Returns a display sender name with fallback.
 */
export function getDisplaySenderName(senderName: string | undefined): string {
  return senderName || 'Sender';
}

/**
 * Returns a display sender line with fallback.
 */
export function getDisplaySenderLine(senderLine: string): string {
  return senderLine || 'sender@example.com';
}

/**
 * Returns the current time as a locale string (e.g. "10:30 AM").
 */
export function formatTime(): string {
  return new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Returns the current date as a locale string (e.g. "Jan 15, 2026").
 */
export function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Builds a subscriber display name from first and last name.
 */
export function buildSubscriberDisplayName(
  firstName?: string | null,
  lastName?: string | null,
): string {
  return (
    [firstName, lastName].filter(Boolean).join(' ') || 'Selected subscriber'
  );
}

/**
 * Disables the column-stacking media query in email HTML by shifting the
 * max-width breakpoint to 1px so it's never triggered in desktop preview.
 */
export function disableMobileBreakpoint(emailHtml: string): string {
  return emailHtml.replace('max-width:425px', 'max-width:1px');
}

/**
 * Returns Tailwind class sizes for the email preview card based on compact mode.
 */
export function getCardSizes(compact: boolean) {
  return {
    avatar: compact ? 'h-7 w-7 text-[11px]' : 'h-9 w-9 text-[13px]',
    headerPad: compact ? 'px-4 py-3' : 'px-5 py-4',
    gap: compact ? 'gap-2' : 'gap-3',
    nameSize: compact ? 'text-xs' : 'text-sm',
    emailSize: compact ? 'text-[11px]' : 'text-[13px]',
    timeSize: compact ? 'text-[10px]' : 'text-[11px]',
    subjectSize: compact ? 'text-xs' : 'text-[13px]',
    bodyHeight: compact ? 'h-75' : 'h-105',
    emptyPad: compact ? 'px-4 py-8 text-xs' : 'px-4 py-8 text-sm',
  };
}
