"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import CardBox from "@/app/components/shared/CardBox";
import type { WorkflowItem } from "@/app/types/workflow";

export const TopWorkflows = () => {
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);

  useEffect(() => {
    const fetchWorkflows = async () => {
      try {
        const response = await fetch("/api/workflows", {
          headers: { browserrefreshed: "false" },
          cache: "no-store",
        });
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as WorkflowItem[];
        setWorkflows(Array.isArray(data) ? data.slice(0, 5) : []);
      } catch {
        setWorkflows([]);
      }
    };

    void fetchWorkflows();
  }, []);

  return (
    <CardBox>
      <div className="flex items-center justify-between mb-3">
        <h5 className="card-title">Top workflows</h5>
        <Link href="/dashboard/apps/workflows" className="text-sm text-primary hover:underline">
          View all workflows →
        </Link>
      </div>

      <div className="space-y-4">
        {workflows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No workflows configured yet.
          </p>
        ) : (
          workflows.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between py-2 border-b border-border last:border-none gap-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground font-mono truncate">
                  {item.key}
                </p>
              </div>

              <div className="text-sm text-muted-foreground w-20 text-right capitalize">
                {item.channels.length} channels
              </div>

              <div
                className={`text-sm font-medium w-20 text-right ${
                  item.isActive ? "text-success" : "text-muted-foreground"
                }`}
              >
                {item.isActive ? "Active" : "Archived"}
              </div>
            </div>
          ))
        )}
      </div>
    </CardBox>
  );
};
