'use client';

import type { ProviderItem } from '@/app/types/provider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { type FormEvent } from 'react';
import type { ProviderDefinition } from '../types';

type ProviderConnectDialogProps = {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly selectedProvider: ProviderDefinition | null;
  readonly editingItem: ProviderItem | null;
  readonly fieldValues: Record<string, string>;
  readonly enabledToggle: boolean;
  readonly primaryToggle: boolean;
  readonly mutatingKey: string | null;
  readonly onFieldChange: (key: string, value: string) => void;
  readonly onEnabledToggle: (checked: boolean) => void;
  readonly onPrimaryToggle: (checked: boolean) => void;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly onClose: () => void;
};

function submitButtonLabel(
  mutatingKey: string | null,
  providerKey: string,
  editingItem: unknown,
): string {
  if (mutatingKey === `save:${providerKey}`) return 'Saving...';
  if (editingItem) return 'Save changes';
  return 'Connect provider';
}

export const ProviderConnectDialog = ({
  open,
  onOpenChange,
  selectedProvider,
  editingItem,
  fieldValues,
  enabledToggle,
  primaryToggle,
  mutatingKey,
  onFieldChange,
  onEnabledToggle,
  onPrimaryToggle,
  onSubmit,
  onClose,
}: ProviderConnectDialogProps) => {
  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (open) {
          onOpenChange(true);
        } else {
          onClose();
        }
      }}
    >
      <DialogContent className="border-border bg-card text-foreground sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingItem ? 'Update provider' : 'Connect provider'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {selectedProvider
              ? `Configure ${selectedProvider.label} for ${selectedProvider.channel} delivery.`
              : 'Configure provider settings.'}
          </DialogDescription>
        </DialogHeader>

        {selectedProvider ? (
          <form className="space-y-4" onSubmit={onSubmit}>
            {selectedProvider.credentials.map((field) => (
              <div key={field.key}>
                <label
                  className="mb-1.5 block text-sm font-medium"
                  htmlFor={field.key}
                >
                  {field.label}
                </label>
                <Input
                  id={field.key}
                  type="password"
                  placeholder={
                    editingItem
                      ? 'Leave empty to keep existing'
                      : field.placeholder
                  }
                  value={fieldValues[field.key] ?? ''}
                  onChange={(e) => onFieldChange(field.key, e.target.value)}
                />
                {editingItem && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Leave empty to keep the currently stored credentials.
                  </p>
                )}
              </div>
            ))}

            {selectedProvider.config.map((field) => (
              <div key={field.key}>
                <label
                  className="mb-1.5 block text-sm font-medium"
                  htmlFor={field.key}
                >
                  {field.label}
                </label>
                <Input
                  id={field.key}
                  type={
                    field.type === 'number' ? 'number' : (field.type ?? 'text')
                  }
                  placeholder={field.placeholder}
                  value={fieldValues[field.key] ?? ''}
                  onChange={(e) => onFieldChange(field.key, e.target.value)}
                />
              </div>
            ))}

            <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label
                    htmlFor="toggle-enabled"
                    className="text-sm font-medium"
                  >
                    Enable provider
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Allow this provider to send notifications
                  </p>
                </div>
                <Switch
                  id="toggle-enabled"
                  checked={enabledToggle}
                  onCheckedChange={(checked) => {
                    onEnabledToggle(checked);
                    if (!checked) onPrimaryToggle(false);
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label
                    htmlFor="toggle-primary"
                    className="text-sm font-medium"
                  >
                    Set as primary
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Use this as the default provider for{' '}
                    {selectedProvider.channel}
                  </p>
                </div>
                <Switch
                  id="toggle-primary"
                  checked={primaryToggle}
                  disabled={!enabledToggle}
                  onCheckedChange={(checked) => {
                    onPrimaryToggle(checked);
                    if (checked) onEnabledToggle(true);
                  }}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={mutatingKey === `save:${selectedProvider.key}`}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-primary text-primary-foreground hover:bg-primaryemphasis"
                disabled={mutatingKey === `save:${selectedProvider.key}`}
              >
                {submitButtonLabel(
                  mutatingKey,
                  selectedProvider.key,
                  editingItem,
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
