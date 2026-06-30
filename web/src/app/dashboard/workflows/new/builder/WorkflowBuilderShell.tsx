'use client';

import { useState } from 'react';
import { Play, Code, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import BreadcrumbComp from '../../../layout/shared/breadcrumb/BreadcrumbComp';
import CreateWorkflowBuilder from '../../../../../features/workflows/components/CreateWorkflowBuilder';
import { TriggerPanelContent } from './TriggerPanelContent';
import { IntegratePanelContent } from './IntegratePanelContent';

interface BreadcrumbItem {
  title: string;
  to?: string;
}

interface WorkflowBuilderShellProps {
  readonly workflowId: string;
  readonly workflowName: string;
  readonly breadcrumbItems: BreadcrumbItem[];
}

const WorkflowBuilderShell = ({
  workflowId,
  workflowName,
  breadcrumbItems,
}: WorkflowBuilderShellProps) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState('trigger');

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

      <DrawerContent className="sm:max-w-lg">
        <DrawerHeader className="flex items-center justify-between border-b border-border px-6 py-4">
          <DrawerTitle className="text-lg font-semibold">
            {drawerTab === 'trigger' ? 'Trigger Workflow' : 'API Integration'}
          </DrawerTitle>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </DrawerClose>
        </DrawerHeader>

        <Tabs
          value={drawerTab}
          onValueChange={setDrawerTab}
          className="flex flex-1 flex-col"
        >
          <TabsList className="mx-6 mt-4 grid w-[calc(100%-3rem)] grid-cols-2">
            <TabsTrigger value="trigger" className="gap-2">
              <Play className="h-4 w-4" />
              Trigger
            </TabsTrigger>
            <TabsTrigger value="integrate" className="gap-2">
              <Code className="h-4 w-4" />
              Integrate
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="trigger"
            className="flex-1 overflow-y-auto px-6 py-4"
          >
            <TriggerPanelContent workflowId={workflowId} />
          </TabsContent>

          <TabsContent
            value="integrate"
            className="flex-1 overflow-y-auto px-6 py-4"
          >
            <IntegratePanelContent
              workflowId={workflowId}
              workflowName={workflowName}
            />
          </TabsContent>
        </Tabs>
      </DrawerContent>
    </Drawer>
  );
};

export default WorkflowBuilderShell;
