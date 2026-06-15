'use client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { useCreateSubscriberForm } from '../hooks/use-create-subscriber-form';
import { PhoneInput } from '../components/PhoneInput';

type CreateSubscriberFormProps = {
  onCreated?: () => void;
  onCancel?: () => void;
  compact?: boolean;
};

const CreateSubscriberForm = ({
  onCreated,
  onCancel,
  compact = false,
}: CreateSubscriberFormProps) => {
  const { form, onSubmit, isPending, isError, error } = useCreateSubscriberForm(
    { onCreated, onCancel },
  );

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
                <FormLabel>Email</FormLabel>
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
                  <PhoneInput
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="(555) 000-0000"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="mt-6">
          <FormField
            name="metadata"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Metadata (JSON)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder='{"key": "value", "preferences": {...}}'
                    className="w-full bg-background min-h-[100px] font-mono text-sm"
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
