import type { PreviewSubscriber } from '../types/data-panel';

/**
 * Gets the preview value for a variable path from a preview subscriber.
 */
export function getPreviewValue(
  path: string,
  subscriber: PreviewSubscriber | null,
): string | undefined {
  if (!subscriber) return undefined;

  const parts = path.split('.');
  if (parts.length < 2) return undefined;

  const group = parts[0];
  const field = parts.slice(1).join('.');

  if (group === 'subscriber') {
    switch (field) {
      case 'firstName':
        return subscriber.firstName;
      case 'lastName':
        return subscriber.lastName;
      case 'email':
        return subscriber.email;
      case 'phone':
        return subscriber.phone;
      case 'name':
        return (
          [subscriber.firstName, subscriber.lastName]
            .filter(Boolean)
            .join(' ') || undefined
        );
      default:
        if (subscriber.metadata && field in subscriber.metadata) {
          return String(subscriber.metadata[field]);
        }
        return undefined;
    }
  }

  return undefined;
}
