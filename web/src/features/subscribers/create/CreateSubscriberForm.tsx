'use client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { useCreateSubscriberForm } from '../hooks/use-create-subscriber-form';

type CreateSubscriberFormProps = {
  onCreated?: () => void;
  onCancel?: () => void;
  compact?: boolean;
};

const CHANNEL_OPTIONS = [
  { value: 'email' as const, label: 'Email' },
  { value: 'sms' as const, label: 'SMS' },
  { value: 'push' as const, label: 'Push' },
];

const CreateSubscriberForm = ({
  onCreated,
  onCancel,
  compact = false,
}: CreateSubscriberFormProps) => {
  const {
    form,
    channels,
    tagInput,
    setTagInput,
    handleAddTag,
    handleRemoveTag,
    handleKeyDown,
    onSubmit,
    isPending,
    isError,
    error,
  } = useCreateSubscriberForm({ onCreated, onCancel });

  const toggleChannel = (channel: 'email' | 'sms' | 'push') => {
    const current = form.getValues('channels');
    const updated = current.includes(channel)
      ? current.filter((c) => c !== channel)
      : [...current, channel];
    form.setValue('channels', updated, { shouldValidate: true });
  };

  const formBody = (
    <Form {...form}>
      <form onSubmit={onSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Subscriber name"
                    className="w-full bg-background"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email *</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="subscriber@example.com"
                    className="w-full bg-background"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone (Optional)</FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    className="w-full bg-background"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="pushToken"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Push Token (Optional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="expo-token-or-device-token"
                    className="w-full bg-background"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div>
            <FormLabel className="mb-2 block text-foreground">
              Notification Channels
            </FormLabel>
            <div className="flex flex-wrap gap-4 rounded-md border border-border bg-muted/40 p-3">
              {CHANNEL_OPTIONS.map(({ value, label }) => (
                <div key={value} className="flex items-center gap-2">
                  <Checkbox
                    id={`channel-${value}`}
                    checked={channels.includes(value)}
                    onCheckedChange={() => toggleChannel(value)}
                  />
                  <label
                    htmlFor={`channel-${value}`}
                    className="font-normal cursor-pointer text-foreground text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {label}
                  </label>
                </div>
              ))}
            </div>
            {form.formState.errors.channels && (
              <p className="mt-2 text-xs text-destructive">
                {form.formState.errors.channels.message}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6">
          <FormLabel className="mb-2 block text-foreground">Tags</FormLabel>
          <div className="flex gap-2 mb-3">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add tag and press Enter"
              className="w-full bg-background"
            />
            <Button
              type="button"
              onClick={handleAddTag}
              variant="outline"
              className="border-border"
            >
              Add
            </Button>
          </div>
          {form.formState.errors.tags && (
            <p className="mt-1 text-xs text-destructive">
              {form.formState.errors.tags.message}
            </p>
          )}

          {form.watch('tags').length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {form.watch('tags').map((tag) => (
                <div
                  key={tag}
                  className="bg-lightprimary text-primary px-3 py-1 rounded-full text-sm flex items-center gap-2"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:bg-primary hover:text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-lg"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6 justify-end">
          {isError && (
            <p className="text-sm text-destructive mr-auto">
              {error?.message ??
                'Failed to create subscriber. Please try again.'}
            </p>
          )}
          <Button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-primary text-primary-foreground hover:bg-primaryemphasis"
          >
            {isPending ? 'Saving...' : 'Save Subscriber'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-md border-border text-foreground hover:bg-lightprimary"
            onClick={() => onCancel?.()}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );

  if (compact) {
    return formBody;
  }

  return (
    <div className="rounded-2xl border border-border bg-dark p-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-4 text-foreground">
        Add New Subscriber
      </h2>
      {formBody}
    </div>
  );
};

export default CreateSubscriberForm;
