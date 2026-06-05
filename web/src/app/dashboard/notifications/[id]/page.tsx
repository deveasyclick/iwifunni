'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import CardBox from '@/components/card/CardBox';
import BreadcrumbComp from '@/app/dashboard/layout/shared/breadcrumb/BreadcrumbComp';
import type { NotificationType } from '@/app/types/notification';

type NotificationDetail = NotificationType;

const formatDateTime = (value: Date | string | undefined) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return format(date, 'MMM dd, yyyy HH:mm');
};

const getStatusBadge = (status?: string) => {
  switch (status) {
    case 'sent':
      return 'lightSuccess';
    case 'pending':
      return 'lightWarning';
    case 'failed':
      return 'lightError';
    case 'partial_failed':
      return 'lightSecondary';
    default:
      return 'default';
  }
};

export default function NotificationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const notificationId = params.id as string;

  const [notification, setNotification] = useState<NotificationDetail | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotification = async () => {
      try {
        const res = await fetch(`/api/notifications/${notificationId}`, {
          headers: { browserrefreshed: 'false' },
        });

        if (!res.ok) {
          setNotification(null);
          return;
        }

        const data = (await res.json()) as
          | { data?: NotificationDetail }
          | NotificationDetail;
        const body = 'data' in data ? data.data : (data as NotificationDetail);
        if (body) {
          setNotification(body);
          return;
        }
      } catch (err) {
        console.error('Error fetching notification:', err);
        setNotification(null);
      } finally {
        setLoading(false);
      }
    };
    void fetchNotification();
  }, [notificationId]);

  const handleRefresh = () => {
    router.refresh();
  };

  const BCrumb = [
    { to: '/', title: 'Home' },
    { to: '/dashboard/notifications', title: 'Notifications' },
    { title: notificationId || 'Notification' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!notification) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="text-lg text-error">Notification not found</div>
          <Button
            onClick={() => router.push('/dashboard/notifications')}
            className="rounded-md bg-primary text-primary-foreground hover:bg-primaryemphasis"
          >
            Back to notifications
          </Button>
        </div>
      </div>
    );
  }

  const metadataEntries = Object.entries(notification.metadata ?? {});

  return (
    <>
      <BreadcrumbComp
        title={`Notification: ${notification.id}`}
        items={BCrumb}
      />

      <CardBox>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {notification.title}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              ID: <span className="font-mono">{notification.id}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleRefresh}
              variant="outline"
              className="rounded-md border-border text-foreground hover:bg-muted"
              size="sm"
            >
              <Icon icon="tabler:refresh" height="18" className="mr-1" />
              Refresh
            </Button>
            <Button
              onClick={() => router.push('/dashboard/notifications')}
              className="rounded-md bg-primary text-primary-foreground hover:bg-primaryemphasis"
              size="sm"
            >
              <Icon icon="tabler:arrow-left" height="18" className="mr-1" />
              Back
            </Button>
          </div>
        </div>

        {/* Key Info Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 bg-muted rounded-md border border-border">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Status</p>
            <Badge
              variant={getStatusBadge(notification.status)}
              className="rounded-md"
            >
              {notification.status || 'unknown'}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">User ID</p>
            <p className="text-sm font-medium">
              {notification.user_id ?? 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Retry Count</p>
            <p className="text-sm font-medium">
              {notification.retry_count ?? 0}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Created</p>
            <p className="text-sm font-medium">
              {format(new Date(notification.created_at), 'E, MMM d')}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Service ID</p>
            <p className="text-sm font-medium">
              {notification.service_id ?? 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Environment ID</p>
            <p className="text-sm font-medium">
              {notification.environment_id ?? 'N/A'}
            </p>
          </div>
        </div>

        {/* Message Section */}
        <div className="mb-6 p-4 border border-border rounded-md bg-card">
          <p className="text-xs text-muted-foreground mb-2 font-semibold">
            Message
          </p>
          <p className="text-sm leading-6 whitespace-pre-wrap text-foreground">
            {notification.message || 'N/A'}
          </p>
        </div>

        {/* Channels Section */}
        <div className="mb-6">
          <p className="text-sm font-semibold text-foreground mb-3">Channels</p>
          {notification.channels && notification.channels.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {notification.channels.map((channel) => (
                <Badge key={channel} variant="outline" className="text-xs">
                  {channel.charAt(0).toUpperCase() + channel.slice(1)}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No channels specified
            </p>
          )}
        </div>

        {/* Metadata Section */}
        {metadataEntries.length > 0 && (
          <div className="mb-6">
            <p className="text-sm font-semibold text-foreground mb-3">
              Metadata
            </p>
            <div className="overflow-x-auto rounded-md border border-border">
              <Table className="text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metadataEntries.map(([key, value]) => (
                    <TableRow key={key}>
                      <TableCell className="font-mono text-xs">{key}</TableCell>
                      <TableCell>
                        {typeof value === 'object' && value !== null
                          ? JSON.stringify(value)
                          : String(value)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Details Footer */}
        <div className="mt-6 pt-4 border-t border-border flex gap-2 text-xs text-muted-foreground">
          <Icon icon="tabler:info-circle" height="16" />
          <span>Last updated {formatDateTime(notification.updated_at)}</span>
        </div>
      </CardBox>
    </>
  );
}
