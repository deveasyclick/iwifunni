'use client';

import Link from 'next/link';
import { Icon } from '@iconify/react';
import {
  Pencil,
  Trash2,
  Activity,
  Play,
  Pause,
  MoreVertical,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { TableBody, TableCell, TableRow } from '@/components/ui/table';
import { formatCreatedAt } from '@/features/workflows/utils/dates';

import type { WorkflowTableBodyProps } from '@/features/workflows/types/ui';

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

const WorkflowTableBody = ({
  loading,
  visibleItems,
  mutatingID,
  onRequestPause,
  onRequestDelete,
}: WorkflowTableBodyProps) => {
  if (loading) {
    return (
      <TableBody>
        <TableRow>
          <TableCell colSpan={6} className="text-center text-muted-foreground">
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
          <TableCell colSpan={6} className="text-center text-muted-foreground">
            No workflows configured yet.
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }

  return (
    <TableBody>
      {visibleItems.map((item) => {
        const isMutating = mutatingID === item.id;
        const isPaused = item.status === 'paused';

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
            <TableCell>
              <div className="flex gap-1.5">
                {(item.channels ?? []).map((ch) => (
                  <Badge
                    key={ch}
                    variant="outline"
                    className="flex items-center gap-1 rounded-md text-xs capitalize"
                  >
                    <Icon icon={channelIcon(ch)} className="h-3 w-3" />
                    {ch}
                  </Badge>
                ))}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={isPaused ? 'secondary' : 'lightSuccess'}>
                {isPaused ? 'Inactive' : 'Active'}
              </Badge>
            </TableCell>
            <TableCell>{formatCreatedAt(item.createdAt)}</TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" disabled={isMutating}>
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link
                      href={`/dashboard/workflows/new/builder?workflowId=${item.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href={`/dashboard/workflows/${item.id}/activities`}
                    >
                      <Activity className="h-4 w-4" />
                      Activities
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onRequestPause(item)}>
                    {isPaused ? (
                      <Play className="h-4 w-4" />
                    ) : (
                      <Pause className="h-4 w-4" />
                    )}
                    {isPaused ? 'Resume' : 'Pause'}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onRequestDelete(item)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        );
      })}
    </TableBody>
  );
};

export default WorkflowTableBody;
