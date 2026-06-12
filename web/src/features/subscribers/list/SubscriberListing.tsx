'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Icon } from '@iconify/react';
import type { SubscriberType } from '@/app/types/subscriber';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import CreateSubscriberForm from '../create/CreateSubscriberForm';

interface SubscriberListingProps {
  subscribers: SubscriberType[];
  isEmpty: boolean;
  search: string;
  onSearch: (term: string) => void;
  onDeleteClick: (subscriber: SubscriberType) => void;
}

const SubscriberListing: React.FC<SubscriberListingProps> = ({
  subscribers,
  isEmpty,
  search,
  onSearch,
  onDeleteClick,
}) => {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyId = useCallback(async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // clipboard not available
    }
  }, []);

  return (
    <TooltipProvider>
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
                  Create a new subscriber with email and phone channels.
                </DialogDescription>
              </DialogHeader>
              <CreateSubscriberForm
                compact
                onCreated={() => setCreateOpen(false)}
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
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search id, name, email, phone"
            />
          </div>
        </div>

        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Icon
              icon="tabler:users-off"
              height={48}
              className="text-muted-foreground"
            />
            <p className="text-lg text-muted-foreground">No subscribers yet</p>
            <p className="text-sm text-muted-foreground">
              Create your first subscriber to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Updated At</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscribers.map((subscriber) => (
                  <TableRow key={subscriber.id}>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-base font-medium">
                          {subscriber.name}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs text-muted-foreground">
                            {subscriber.id}
                          </span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => handleCopyId(subscriber.id)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                              >
                                {copiedId === subscriber.id ? (
                                  <Icon
                                    icon="tabler:check"
                                    height={14}
                                    className="text-lightSuccess"
                                  />
                                ) : (
                                  <Icon
                                    icon="tabler:copy"
                                    height={14}
                                  />
                                )}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                {copiedId === subscriber.id
                                  ? 'Copied!'
                                  : 'Copy ID'}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>{subscriber.email || 'N/A'}</TableCell>

                    <TableCell>{subscriber.phone || 'N/A'}</TableCell>

                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {subscriber.createdAt
                        ? format(new Date(subscriber.createdAt), 'MMM dd, yyyy HH:mm')
                        : 'N/A'}
                    </TableCell>

                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {subscriber.updatedAt
                        ? format(new Date(subscriber.updatedAt), 'MMM dd, yyyy HH:mm')
                        : 'N/A'}
                    </TableCell>

                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <Icon
                              icon="tabler:dots-vertical"
                              height={18}
                            />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[140px]">
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(
                                `/dashboard/subscribers/${subscriber.id}`,
                              )
                            }
                          >
                            <Icon
                              icon="tabler:edit"
                              height={16}
                              className="mr-2"
                            />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-error focus:text-error"
                            onClick={() => onDeleteClick(subscriber)}
                          >
                            <Icon
                              icon="tabler:trash"
                              height={16}
                              className="mr-2"
                            />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default SubscriberListing;
