'use client';

import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useWorkflowQuery } from '@/features/workflows/queries';
import { buildWorkflowBuilderHref } from '@/features/workflows/utils/urls';
import { Code, Play, X } from 'lucide-react';
import { useState } from 'react';
import CreateWorkflowBuilder from '../../../../../features/workflows/components/CreateWorkflowBuilder';
import BreadcrumbComp from '../../../layout/shared/breadcrumb/BreadcrumbComp';
import { IntegratePanelContent } from './IntegratePanelContent';
import { TriggerPanelContent } from './TriggerPanelContent';

interface WorkflowBuilderShellProps {
  readonly workflowId: string;
}

const WorkflowBuilderShell = ({ workflowId }: WorkflowBuilderShellProps) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState('trigger');

  const { data: workflow } = useWorkflowQuery(workflowId);
  const workflowName = workflow?.name ?? 'Workflow Builder';

  const breadcrumbItems = [
    {
      to: '/dashboard/workflows',
      title: 'Workflows',
    },
    {
      to: buildWorkflowBuilderHref({ workflowId }),
      title: workflowName,
    },
  ];

  const openDrawer = (tab: string) => {
    setDrawerTab(tab);
    setDrawerOpen(true);
  };

  return (
    <Drawer direction="right" open={drawerOpen} onOpenChange={setDrawerOpen}>
      <BreadcrumbComp title={workflowName} items={breadcrumbItems} />

      {/* Action bar */}
      <div className="mb-6 flex items-center justify-end gap-3">
        <Button
          variant="default"
          size="sm"
          className="gap-2"
          onClick={() => openDrawer('trigger')}
        >
          <Play className="h-4 w-4" />
          Trigger
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => openDrawer('integrate')}
        >
          <Code className="h-4 w-4" />
          Integrate
        </Button>
      </div>

      <CreateWorkflowBuilder workflowId={workflowId} />

      <DrawerContent className="sm:max-w-lg!">
        <DrawerHeader className="flex flex-row items-start justify-between border-b border-border bg-muted/30 px-6 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {drawerTab === 'trigger' ? (
                <Play className="h-4 w-4" />
              ) : (
                <Code className="h-4 w-4" />
              )}
            </div>
            <div>
              <DrawerTitle className="text-sm font-semibold">
                {drawerTab === 'trigger'
                  ? 'Trigger Workflow'
                  : 'API Integration'}
              </DrawerTitle>
              <p className="text-xs text-muted-foreground">
                {drawerTab === 'trigger'
                  ? 'Send a test notification through this workflow'
                  : 'Use the API to trigger this workflow programmatically'}
              </p>
            </div>
          </div>
          <DrawerClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </DrawerClose>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {drawerTab === 'trigger' ? (
            <TriggerPanelContent workflowId={workflowId} />
          ) : (
            <IntegratePanelContent
              workflowId={workflowId}
              workflowName={workflowName}
            />
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default WorkflowBuilderShell;
