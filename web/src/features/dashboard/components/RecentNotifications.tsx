'use client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import CardBox from '@/components/card/CardBox';
import { STATUS_BADGE, STATUS_LABEL } from '../constants';
import { formatTime } from '../utils';

interface RecentNotificationsProps {
  readonly data?: Array<{
    id: string;
    title: string;
    message: string;
    channels: string[];
    status: string;
    created_at: string;
  }>;
  readonly isLoading?: boolean;
}

function renderContent(
  isLoading: boolean | undefined,
  data: RecentNotificationsProps['data'],
) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
        Loading...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
        No notifications yet
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-muted-foreground">
                Notification
              </TableHead>
              <TableHead className="text-muted-foreground">Channel</TableHead>
              <TableHead className="text-muted-foreground">Status</TableHead>
              <TableHead className="text-muted-foreground">Time</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {data.map((item, index) => (
              <motion.tr
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{
                  scale: 1.01,
                }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="border-b border-border"
              >
                <TableCell className="font-medium max-w-[200px] truncate">
                  {item.title || item.message}
                </TableCell>

                <TableCell className="text-muted-foreground">
                  {item.channels.join(', ')}
                </TableCell>

                <TableCell>
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Badge
                      className={`px-3 py-0.5 rounded-full text-xs ${
                        STATUS_BADGE[item.status] ||
                        'bg-muted text-muted-foreground'
                      }`}
                    >
                      {STATUS_LABEL[item.status] || item.status}
                    </Badge>
                  </motion.div>
                </TableCell>

                <TableCell className="text-muted-foreground text-xs">
                  {formatTime(item.created_at)}
                </TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 text-right">
        <button className="text-sm text-primary hover:underline">
          View all notifications →
        </button>
      </div>
    </>
  );
}

export const RecentNotifications = ({
  data,
  isLoading,
}: RecentNotificationsProps) => {
  return (
    <CardBox>
      <div className="mb-3">
        <h5 className="card-title">Recent notifications</h5>
      </div>

      {renderContent(isLoading, data)}
    </CardBox>
  );
};
