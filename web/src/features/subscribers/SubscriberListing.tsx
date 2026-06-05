'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Icon } from '@iconify/react';
import type {
  SubscriberStatusValue,
  SubscriberType,
} from '@/app/types/subscriber';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import CreateSubscriberForm from './CreateSubscriberForm';

interface SubscriberListingProps {
  subscribers: SubscriberType[];
  deleteSubscriber: (id: string) => void;
  searchSubscribers: (term: string) => void;
  addSubscriber: (subscriber: SubscriberType) => void;
  subscriberSearch: string;
  filter: string;
}

const SubscriberListing: React.FC<SubscriberListingProps> = ({
  subscribers,
  deleteSubscriber,
  searchSubscribers,
  addSubscriber,
  subscriberSearch,
  filter,
}) => {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);

  const getVisibleSubscribers = (
    subscribers: SubscriberType[],
    filter: string,
    subscriberSearch: string,
  ) => {
    const lowerSearch = subscriberSearch.toLowerCase();

    return subscribers.filter(
      (subscriber) =>
        !subscriber.deleted &&
        (filter === 'total_subscribers' ||
          subscriber.status.email === filter ||
          subscriber.status.sms === filter ||
          subscriber.status.push === filter) &&
        (subscriber.email?.toLowerCase().includes(lowerSearch) ||
          subscriber.phone?.toLowerCase().includes(lowerSearch) ||
          subscriber.pushToken?.toLowerCase().includes(lowerSearch) ||
          subscriber.id.toLowerCase().includes(lowerSearch) ||
          subscriber.name.toLowerCase().includes(lowerSearch)),
    );
  };

  const visibleSubscribers = getVisibleSubscribers(
    subscribers,
    filter,
    subscriberSearch,
  );

  const statusBadge = (status?: SubscriberStatusValue) => {
    switch (status) {
      case 'subscribed':
        return 'lightSuccess';
      case 'unsubscribed':
        return 'lightWarning';
      case 'bounced':
        return 'lightError';
      default:
        return 'default';
    }
  };

  return (
    <div className="my-6">
      <div className="flex justify-between items-center mb-4 gap-4">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-md whitespace-nowrap bg-primary text-primary-foreground hover:bg-primaryemphasis">
              Add Subscriber
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl border-border bg-card text-foreground sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                Add New Subscriber
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Create a multi-channel subscriber with email, phone, push, and
                tags.
              </DialogDescription>
            </DialogHeader>
            <CreateSubscriberForm
              compact
              onCreated={(subscriber) => {
                addSubscriber(subscriber);
                setCreateOpen(false);
              }}
              onCancel={() => setCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>

        <div className="relative sm:max-w-60 max-w-full w-full">
          <Icon
            icon="tabler:search"
            height={18}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="text"
            className="pl-8 bg-background"
            onChange={(e) => searchSubscribers(e.target.value)}
            placeholder="Search id, name, email, phone"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subscriber ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Push Token</TableHead>
              <TableHead>Channels</TableHead>
              <TableHead>Channel Status</TableHead>
              <TableHead>Subscription Date</TableHead>
              <TableHead className="text-end">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleSubscribers.map((subscriber) => (
              <TableRow key={subscriber.id}>
                <TableCell>
                  <span className="font-mono text-xs text-muted-foreground">
                    {subscriber.id}
                  </span>
                </TableCell>

                <TableCell>
                  <h6 className="text-base">{subscriber.name}</h6>
                </TableCell>

                <TableCell>{subscriber.email || 'N/A'}</TableCell>

                <TableCell>{subscriber.phone || 'N/A'}</TableCell>

                <TableCell className="max-w-45 truncate text-foreground">
                  {subscriber.pushToken || 'N/A'}
                </TableCell>

                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {subscriber.channels.includes('email') && (
                      <Badge variant="outline" className="text-xs">
                        Email
                      </Badge>
                    )}
                    {subscriber.channels.includes('sms') && (
                      <Badge variant="outline" className="text-xs">
                        SMS
                      </Badge>
                    )}
                    {subscriber.channels.includes('push') && (
                      <Badge variant="outline" className="text-xs">
                        Push
                      </Badge>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {subscriber.channels.includes('email') && (
                      <Badge
                        variant={statusBadge(subscriber.status.email)}
                        className="rounded-md"
                      >
                        Email: {subscriber.status.email || 'unknown'}
                      </Badge>
                    )}
                    {subscriber.channels.includes('sms') && (
                      <Badge
                        variant={statusBadge(subscriber.status.sms)}
                        className="rounded-md"
                      >
                        SMS: {subscriber.status.sms || 'unknown'}
                      </Badge>
                    )}
                    {subscriber.channels.includes('push') && (
                      <Badge
                        variant={statusBadge(subscriber.status.push)}
                        className="rounded-md"
                      >
                        Push: {subscriber.status.push || 'unknown'}
                      </Badge>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(subscriber.subscriptionDate), 'E, MMM d')}
                  </p>
                </TableCell>

                <TableCell className="text-end">
                  <div className="flex justify-end gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              router.push(
                                `/dashboard/subscribers/${subscriber.id}`,
                              )
                            }
                          >
                            <Icon icon="tabler:edit" height="18" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Edit Subscriber</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="hover:text-error"
                            onClick={() => deleteSubscriber(subscriber.id)}
                          >
                            <Icon icon="tabler:trash" height="18" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Delete Subscriber</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default SubscriberListing;
