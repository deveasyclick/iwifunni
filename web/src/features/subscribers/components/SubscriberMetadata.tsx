import { format } from 'date-fns';

type SubscriberMetadataProps = {
  subscriberId: string;
  subscriptionDate: string | Date;
  lastNotificationDate?: string | Date | null;
};

export function SubscriberMetadata({
  subscriberId,
  subscriptionDate,
  lastNotificationDate,
}: Readonly<SubscriberMetadataProps>) {
  return (
    <div className="bg-muted p-4 rounded-md mb-6">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">ID</p>
          <p className="font-mono">{subscriberId}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Subscription Date</p>
          <p>{format(new Date(subscriptionDate), 'MMM dd, yyyy')}</p>
        </div>
        {lastNotificationDate && (
          <div>
            <p className="text-muted-foreground">Last Notification</p>
            <p>{format(new Date(lastNotificationDate), 'MMM dd, yyyy')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
