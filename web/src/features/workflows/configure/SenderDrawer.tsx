'use client';

import { useState } from 'react';
import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

type Props = {
  senderName: string;
  senderEmail: string;
  useDefaults: boolean;
  hasProvider: boolean;
  providerLoading: boolean;
  providerName?: string;
  providerEmail?: string;
  onChange: (name: string, email: string, useDefaults: boolean) => void;
};

export function SenderDrawer({
  senderName,
  senderEmail,
  useDefaults,
  hasProvider,
  providerLoading,
  providerName,
  providerEmail,
  onChange,
}: Readonly<Props>) {
  const [open, setOpen] = useState(false);
  const [localName, setLocalName] = useState(senderName);
  const [localEmail, setLocalEmail] = useState(senderEmail);
  const [localUseDefaults, setLocalUseDefaults] = useState(useDefaults);

  const handleSave = () => {
    onChange(localName, localEmail, localUseDefaults);
    setOpen(false);
  };

  // Determine what to show in the compact view
  const showName =
    useDefaults && hasProvider
      ? providerName || 'Default provider'
      : localName || 'Yusuf';
  const showEmail =
    useDefaults && hasProvider
      ? providerEmail || ''
      : (localEmail ?? localUseDefaults ?? 'yusuf@eayclick.com');
  const showLine = showEmail ? `${showName} <${showEmail}>` : showName;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
        <div className="min-w-0 text-sm">
          <p className="truncate font-medium text-foreground">{showLine}</p>
          {useDefaults && hasProvider && (
            <p className="truncate text-xs text-muted-foreground">
              From provider
            </p>
          )}
        </div>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
            <Settings2 className="h-3.5 w-3.5" />
          </Button>
        </SheetTrigger>
      </div>

      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Sender Settings</SheetTitle>
          <SheetDescription>
            Configure the sender name and email for this channel.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-2">
            <Switch
              id="use-defaults"
              checked={localUseDefaults}
              onCheckedChange={hasProvider ? setLocalUseDefaults : undefined}
              disabled={!hasProvider || providerLoading}
            />
            <Label htmlFor="use-defaults" className="text-sm">
              Use default provider settings
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sender-name" className="text-sm">
              Sender name
            </Label>
            <Input
              id="sender-name"
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              placeholder="My App"
              disabled={localUseDefaults}
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sender-email" className="text-sm">
              Sender email
            </Label>
            <Input
              id="sender-email"
              value={localEmail}
              onChange={(e) => setLocalEmail(e.target.value)}
              placeholder="no-reply@example.com"
              disabled={localUseDefaults}
              className="h-8 text-sm"
            />
          </div>

          <Button onClick={handleSave} className="w-full">
            Save
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
