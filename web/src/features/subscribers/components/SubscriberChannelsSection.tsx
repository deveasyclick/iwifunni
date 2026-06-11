import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import type { NotificationChannel } from '@/app/types/notification';

type SubscriberChannelsSectionProps = {
  channels: NotificationChannel[];
  editing: boolean;
  onChannelChange: (channel: Channel, checked: boolean) => void;
};

export function SubscriberChannelsSection({
  channels,
  editing,
  onChannelChange,
}: Readonly<SubscriberChannelsSectionProps>) {
  return (
    <div className="mt-6">
      <Label className="mb-3 block">Notification Channels</Label>
      <div className="flex gap-6">
        <div className="flex items-center gap-2">
          <Checkbox
            id="email-channel"
            checked={channels.includes('email')}
            onCheckedChange={(checked) =>
              onChannelChange('email', checked as boolean)
            }
            disabled={!editing}
          />
          <Label htmlFor="email-channel" className="font-normal cursor-pointer">
            Email
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="sms-channel"
            checked={channels.includes('sms')}
            onCheckedChange={(checked) =>
              onChannelChange('sms', checked as boolean)
            }
            disabled={!editing}
          />
          <Label htmlFor="sms-channel" className="font-normal cursor-pointer">
            SMS
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="push-channel"
            checked={channels.includes('push')}
            onCheckedChange={(checked) =>
              onChannelChange('push', checked as boolean)
            }
            disabled={!editing}
          />
          <Label htmlFor="push-channel" className="font-normal cursor-pointer">
            Push
          </Label>
        </div>
      </div>
    </div>
  );
}
