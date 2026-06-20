import { AlertTriangle } from 'lucide-react';

type Props = {
  readonly smsSenderId?: string;
  readonly smsHasProvider?: boolean;
};

/**
 * Displays the SMS sender ID from the connected provider, or a warning
 * when no SMS provider is configured.
 */
export function SmsSenderInfo({ smsSenderId, smsHasProvider }: Props) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
        smsHasProvider && smsSenderId
          ? 'border-border/50 bg-muted/30'
          : 'border-amber-400/40 bg-amber-50/80 dark:bg-amber-900/15'
      }`}
    >
      <div className="min-w-0 text-sm">
        {smsHasProvider && smsSenderId ? (
          <>
            <p className="truncate font-medium text-foreground">
              From: {smsSenderId}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              Provider sender ID
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="truncate text-sm font-medium text-amber-800 dark:text-amber-300">
                No SMS provider configured
              </p>
            </div>
            <p className="mt-0.5 truncate text-xs text-amber-700/70 dark:text-amber-400/70">
              Configure an SMS provider in Settings → Providers
            </p>
          </>
        )}
      </div>
    </div>
  );
}
