import { uniqueId } from "lodash";

export interface ChildItem {
  id?: number | string;
  name?: string;
  icon?: string;
  children?: ChildItem[];
  item?: unknown;
  url?: string;
  color?: string;
  disabled?: boolean;
  subtitle?: string;
  badge?: boolean;
  badgeType?: string;
  isPro?: boolean;
}

export interface MenuItem {
  heading?: string;
  name?: string;
  icon?: string;
  id?: number | string;
  to?: string;
  items?: MenuItem[];
  children?: ChildItem[];
  url?: string;
  disabled?: boolean;
  subtitle?: string;
  badgeType?: string;
  badge?: boolean;
  isPro?: boolean;
}

const SidebarContent: MenuItem[] = [
  {
    heading: "",
    children: [
      {
        name: "Overview",
        icon: "solar:widget-2-linear",
        id: uniqueId(),
        url: "/dashboard",
        isPro: false,
      },
      {
        id: uniqueId(),
        name: "Workflows",
        icon: "octicon:workflow-24",
        url: "/dashboard/apps/workflows",
        isPro: false,
      },
      {
        id: uniqueId(),
        name: "Subscribers",
        icon: "mynaui:users",
        url: "/dashboard/subscribers",
        isPro: false,
      },
      {
        id: uniqueId(),
        name: "Notifications",
        icon: "ant-design:notification-outlined",
        url: "/dashboard/notifications",
        isPro: false,
      },
      {
        id: uniqueId(),
        name: "Templates",
        icon: "streamline-pixel:content-files-note",
        url: "/dashboard/settings/templates",
        isPro: false,
      },
      {
        id: uniqueId(),
        name: "Setting",
        icon: "mdi-light:settings",
        url: "/dashboard/settings",
        isPro: false,
        children: [
          {
            id: uniqueId(),
            name: "API Keys",
            url: "/dashboard/settings/apikey",
          },
          {
            id: uniqueId(),
            name: "Webhooks",
            url: "/dashboard/settings/webhook",
          },
          {
            id: uniqueId(),
            name: "Integrations",
            url: "/dashboard/settings/integrations",
          },
        ],
      },
    ],
  },
];

export default SidebarContent;
