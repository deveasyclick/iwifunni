import type { Metadata } from 'next';
import WorkflowManagement from '../components/workflows/WorkflowManagement';

export const metadata: Metadata = {
  title: 'Workflows',
};

const WorkflowPage = () => {
  return <WorkflowManagement />;
};

export default WorkflowPage;
