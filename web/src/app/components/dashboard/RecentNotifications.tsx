"use client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import CardBox from "../shared/CardBox";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

export const RecentNotifications = () => {
  const notifications = [
    {
      id: 1,
      message: "Welcome to Novu! 👋",
      channel: "In-App",
      to: "user_123",
      status: "Delivered",
      time: "Just now",
    },
    {
      id: 2,
      message: "Welcome to Novu!",
      channel: "Email",
      to: "user_123@example.com",
      status: "Delivered",
      time: "2m ago",
    },
    {
      id: 3,
      message: "Your code is 123456",
      channel: "SMS",
      to: "+1 (555) 123 4567",
      status: "Delivered",
      time: "5m ago",
    },
    {
      id: 4,
      message: "New message from John",
      channel: "Push",
      to: "user_123",
      status: "Failed",
      time: "10m ago",
    },
    {
      id: 5,
      message: "Reset your password",
      channel: "Email",
      to: "user_456@example.com",
      status: "Delivered",
      time: "1h ago",
    },
  ];

  return (
    <CardBox>
      <div className="mb-3">
        <h5 className="card-title">Recent notifications</h5>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-muted-foreground">
                Notification
              </TableHead>
              <TableHead className="text-muted-foreground">Channel</TableHead>
              <TableHead className="text-muted-foreground">To</TableHead>
              <TableHead className="text-muted-foreground">Status</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {notifications.map((item, index) => (
              <motion.tr
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{
                  scale: 1.01,
                }}
                transition={{ type: "spring", stiffness: 300 }}
                className="border-b border-border"
              >
                <TableCell className="font-medium">{item.message}</TableCell>

                <TableCell className="text-muted-foreground">
                  {item.channel}
                </TableCell>

                <TableCell className="text-muted-foreground">
                  {item.to}
                </TableCell>

                <TableCell>
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Badge
                      className={`px-3 py-0.5 rounded-full text-xs ${
                        item.status === "Delivered"
                          ? "bg-green-500 text-white"
                          : "bg-red-500 text-white"
                      }`}
                    >
                      {item.status}
                    </Badge>
                  </motion.div>
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
    </CardBox>
  );
};
