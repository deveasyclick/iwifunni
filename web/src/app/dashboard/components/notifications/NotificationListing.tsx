"use client";

import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Icon } from "@iconify/react";
import type { NotificationType } from "@/app/types/notification";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NotificationListingProps {
  notifications: NotificationType[];
  searchNotifications: (term: string) => void;
  notificationSearch: string;
  filter: string;
}

const NotificationListing: React.FC<NotificationListingProps> = ({
  notifications,
  searchNotifications,
  notificationSearch,
  filter,
}) => {
  const router = useRouter();

  const getVisibleNotifications = (
    records: NotificationType[],
    selectedFilter: string,
    searchText: string,
  ) => {
    const lowerSearch = searchText.toLowerCase();

    return records.filter(
      (notification) =>
        (selectedFilter === "total_notifications" ||
          notification.status === selectedFilter) &&
        (notification.id.toLowerCase().includes(lowerSearch) ||
          notification.title.toLowerCase().includes(lowerSearch) ||
          notification.message.toLowerCase().includes(lowerSearch)),
    );
  };

  const visibleNotifications = getVisibleNotifications(
    notifications,
    filter,
    notificationSearch,
  );

  const statusBadge = (status?: string) => {
    switch (status) {
      case "sent":
        return "lightSuccess";
      case "pending":
        return "lightWarning";
      case "failed":
        return "lightError";
      case "partial_failed":
        return "lightSecondary";
      default:
        return "default";
    }
  };

  return (
    <div className="my-6">
      <div className="flex justify-end items-center mb-4 gap-4">
        <div className="relative sm:max-w-60 max-w-full w-full">
          <Icon
            icon="tabler:search"
            height={18}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="text"
            className="pl-8 bg-background"
            onChange={(e) => searchNotifications(e.target.value)}
            placeholder="Search id, title, message"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Notification ID</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Channels</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-end">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleNotifications.map((notification) => (
              <TableRow key={notification.id}>
                <TableCell>
                  <span className="font-mono text-xs text-muted-foreground">
                    {notification.id}
                  </span>
                </TableCell>

                <TableCell>
                  <h6 className="text-base">{notification.title}</h6>
                </TableCell>

                <TableCell className="max-w-60 truncate text-foreground">
                  {notification.message}
                </TableCell>

                <TableCell>
                  <Badge
                    variant={statusBadge(notification.status)}
                    className="rounded-md"
                  >
                    {notification.status}
                  </Badge>
                </TableCell>

                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {notification.channels.map((channel) => (
                      <Badge key={channel} variant="outline" className="text-xs">
                        {channel.toUpperCase()}
                      </Badge>
                    ))}
                  </div>
                </TableCell>

                <TableCell>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(notification.created_at), "E, MMM d")}
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
                                `/dashboard/notifications/${notification.id}`,
                              )
                            }
                          >
                            <Icon icon="tabler:eye" height="18" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>View Notification</p>
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

export default NotificationListing;