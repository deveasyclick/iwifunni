'use client';

import Link from 'next/link';
import { Pencil, Trash2, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TableBody, TableCell, TableRow } from '@/components/ui/table';
import { formatCreatedAt } from '@/features/workflows/utils/dates';

import type { WorkflowTableBodyProps } from '@/features/workflows/types/ui';

const WorkflowTableBody = ({
  loading,
  visibleItems,
  mutatingID,
  onRequestDelete,
}: WorkflowTableBodyProps) => {
  if (loading) {
    return (
      <TableBody>
        <TableRow>
          <TableCell colSpan={4} className="text-center text-muted-foreground">
            Loading workflows...
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }

  if (visibleItems.length === 0) {
    return (
      <TableBody>
        <TableRow>
          <TableCell colSpan={4} className="text-center text-muted-foreground">
            No workflows configured yet.
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }

  return (
    <TableBody>
      {visibleItems.map((item) => {
        const isDeleting = mutatingID === item.id;

        return (
          <TableRow key={item.id}>
            <TableCell>
              <div>
                <p className="font-medium">{item.name}</p>
                {item.description && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.description}
                  </p>
                )}
              </div>
            </TableCell>
            <TableCell className="font-mono text-xs">{item.key}</TableCell>
            <TableCell>{formatCreatedAt(item.createdAt)}</TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Button asChild variant="ghost" size="icon">
                  <Link href={`/dashboard/workflows/${item.id}/activities`}>
                    <Activity className="h-4 w-4" />
                    <span className="sr-only">Activities</span>
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="icon">
                  <Link
                    href={`/dashboard/workflows/new/builder?workflowId=${item.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={isDeleting}
                  onClick={() => onRequestDelete(item)}
                >
                  {isDeleting ? (
                    <span className="text-xs">...</span>
                  ) : (
                    <Trash2 className="h-4 w-4 text-destructive" />
                  )}
                  <span className="sr-only">Delete</span>
                </Button>
              </div>
            </TableCell>
          </TableRow>
        );
      })}
    </TableBody>
  );
};

export default WorkflowTableBody;
