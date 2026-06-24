'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { Icon } from '@iconify/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import CardBox from '@/components/card/CardBox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, ExternalLink } from 'lucide-react';
import { useWorkflowActivitiesQuery } from '../queries';

interface WorkflowActivitiesViewProps {
  readonly workflowId: string;
  readonly workflowName: string;
}

const statusVariant = (status?: string) => {
  switch (status) {
    case 'sent':
      return 'lightSuccess' as const;
    case 'pending':
      return 'lightWarning' as const;
    case 'failed':
      return 'lightError' as const;
    case 'partial_failed':
      return 'lightSecondary' as const;
    default:
      return 'default' as const;
  }
};

const channelIcon = (channel: string) => {
  switch (channel) {
    case 'email':
      return 'tabler:mail';
    case 'sms':
      return 'tabler:message';
    case 'push':
      return 'tabler:bell';
    default:
      return 'tabler:send';
  }
};

export function WorkflowActivitiesView({
  workflowId,
  workflowName,
}: WorkflowActivitiesViewProps) {
  const {
    data: activities,
    isLoading,
    error,
  } = useWorkflowActivitiesQuery(workflowId);

  if (isLoading) {
    return (
      <CardBox className="p-6">
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading activities...
        </div>
      </CardBox>
    );
  }

  if (error) {
    return (
      <CardBox className="p-6">
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error instanceof Error ? error.message : 'Failed to load activities'}
        </p>
      </CardBox>
    );
  }

  const items = activities ?? [];

  return (
    <CardBox className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h5 className="text-lg font-semibold">Activities — {workflowName}</h5>
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length} notification
            {items.length !== 1 ? 's' : ''} triggered through this workflow
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/workflows">
            <Icon icon="tabler:arrow-left" className="mr-1 h-4 w-4" />
            Back to workflows
          </Link>
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          No activities yet. Trigger this workflow to see results here.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Channels</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-end">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((notification) => (
                <TableRow key={notification.id}>
                  <TableCell>
                    <p className="font-medium">{notification.title}</p>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={statusVariant(notification.status)}
                      className="rounded-md capitalize"
                    >
                      {notification.status?.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {notification.channels?.map((channel) => (
                        <Icon
                          key={channel}
                          icon={channelIcon(channel)}
                          className="h-4 w-4 text-muted-foreground"
                        />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(
                      new Date(notification.created_at),
                      'MMM d, yyyy HH:mm',
                    )}
                  </TableCell>
                  <TableCell className="text-end">
                    <Button asChild variant="ghost" size="icon">
                      <Link
                        href={`/dashboard/notifications/${notification.id}`}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </CardBox>
  );
}
