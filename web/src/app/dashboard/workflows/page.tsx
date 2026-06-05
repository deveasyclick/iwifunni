import type { Metadata } from 'next';
import WorkflowManagement from '../../../features/workflows/components/WorkflowManagement';

export const metadata: Metadata = {
  title: 'Workflows',
};

const WorkflowPage = () => {
  return <WorkflowManagement />;
};

export default WorkflowPage;
