"use client";
import React, { useEffect, useState } from "react";
import CardBox from "@/app/components/shared/CardBox";
import NotificationFilter from "./NotificationFilter";
import NotificationListing from "./NotificationListing";
import type { NotificationType } from "@/app/types/notification";

const MOCK_NOTIFICATIONS: NotificationType[] = [
  {
    id: "notif_1001",
    user_id: "user_1001",
    service_id: "svc_1001",
    environment_id: "env_1001",
    title: "Welcome Update",
    message: "Your account has been updated successfully.",
    status: "sent",
    channels: ["email", "sms"],
    metadata: { source: "dashboard", campaign: "welcome" },
    retry_count: 0,
    created_at: new Date("2026-04-10T09:00:00Z"),
    updated_at: new Date("2026-04-10T09:10:00Z"),
  },
  {
    id: "notif_1002",
    user_id: "user_1002",
    service_id: "svc_1002",
    environment_id: "env_1001",
    title: "Payment Reminder",
    message: "Your invoice is due tomorrow.",
    status: "pending",
    channels: ["email"],
    metadata: { priority: "high" },
    retry_count: 1,
    created_at: new Date("2026-03-28T11:20:00Z"),
    updated_at: new Date("2026-03-28T11:20:00Z"),
  },
  {
    id: "notif_1003",
    user_id: "user_1003",
    service_id: "svc_1003",
    environment_id: "env_1002",
    title: "Security Alert",
    message: "A new sign-in was detected from a new device.",
    status: "failed",
    channels: ["sms"],
    metadata: { reason: "provider_timeout" },
    retry_count: 3,
    created_at: new Date("2026-02-15T07:30:00Z"),
    updated_at: new Date("2026-02-15T07:45:00Z"),
  },
  {
    id: "notif_1004",
    user_id: "user_1004",
    service_id: "svc_1004",
    environment_id: "env_1002",
    title: "Digest Summary",
    message: "Your weekly digest was partially delivered.",
    status: "partial_failed",
    channels: ["email", "push"],
    metadata: { failed_channel: "push" },
    retry_count: 1,
    created_at: new Date("2026-05-10T14:00:00Z"),
    updated_at: new Date("2026-05-10T14:02:00Z"),
  },
];

const NotificationList = () => {
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [filter, setFilter] = useState<string>("total_notifications");
  const [notificationSearch, setNotificationSearch] = useState<string>("");

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch("/api/notifications", {
          headers: {
            browserrefreshed: "false",
          },
        });

        if (!res.ok) {
          setNotifications(MOCK_NOTIFICATIONS);
          return;
        }

        const json = await res.json();
        const apiNotifications = Array.isArray(json?.data)
          ? (json.data as NotificationType[])
          : Array.isArray(json)
            ? (json as NotificationType[])
            : [];

        setNotifications(apiNotifications);
      } catch (err) {
        console.error("Error fetching notifications:", err);
        setNotifications(MOCK_NOTIFICATIONS);
      }
    };
    fetchNotifications();
  }, []);

  const searchNotifications = (text: string) => {
    setNotificationSearch(text);
  };

  return (
    <CardBox>
      <NotificationFilter notifications={notifications} setFilter={setFilter} />
      <NotificationListing
        notifications={notifications}
        filter={filter}
        notificationSearch={notificationSearch}
        searchNotifications={searchNotifications}
      />
    </CardBox>
  );
};

export default NotificationList;
