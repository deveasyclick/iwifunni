"use client";

import CardBox from "../shared/CardBox";

const workflows = [
  {
    id: 1,
    name: "User Onboarding",
    count: "12.4k",
    change: "+12.3%",
    trend: "up",
    icon: "👤",
  },
  {
    id: 2,
    name: "Password Reset",
    count: "4.7k",
    change: "+8.7%",
    trend: "up",
    icon: "🔐",
  },
  {
    id: 3,
    name: "Order Shipped",
    count: "2.3k",
    change: "+15.2%",
    trend: "up",
    icon: "📦",
  },
  {
    id: 4,
    name: "Abandoned Cart",
    count: "1.9k",
    change: "-3.1%",
    trend: "down",
    icon: "🛒",
  },
  {
    id: 5,
    name: "Comment Reply",
    count: "1.2k",
    change: "+6.4%",
    trend: "up",
    icon: "💬",
  },
];

export const TopWorkflows = () => {
  return (
    <CardBox>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h5 className="card-title">Top workflows</h5>
        <button className="text-sm text-primary hover:underline">
          View all workflows →
        </button>
      </div>

      {/* List */}
      <div className="space-y-4">
        {workflows.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between py-2 border-b border-border last:border-none"
          >
            {/* Left: Icon + Name */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">{item.name}</span>
            </div>

            {/* Count */}
            <div className="text-sm font-medium text-muted-foreground w-20 text-right">
              {item.count}
            </div>

            {/* Change */}
            <div
              className={`text-sm font-medium w-20 text-right ${
                item.trend === "up" ? "text-green-500" : "text-red-500"
              }`}
            >
              {item.change}
            </div>

            {/* Sparkline placeholder */}
            <div className="w-20 h-6 flex items-center justify-end">
              <div
                className={`h-0.5 w-full rounded ${
                  item.trend === "up" ? "bg-blue-500" : "bg-red-500"
                }`}
              />
            </div>
          </div>
        ))}
      </div>
    </CardBox>
  );
};
