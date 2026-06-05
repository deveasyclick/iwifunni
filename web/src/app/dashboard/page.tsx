import Activities from '../../features/dashboard/components/Activities';
import ChannelBreakdown from '../../features/dashboard/components/ChannelBreakdown';
import { TopCards } from '../../features/dashboard/components/TopCards';
import ProfileWelcome from '../../features/dashboard/components/ProfileWelcome';
import { RecentNotifications } from '../../features/dashboard/components/RecentNotifications';
import { TopWorkflows } from '../../features/dashboard/components/TopWorkflow';
import DeliveryPerformance from '../../features/dashboard/components/DeliveryPerformance';
import IntegrationsCard from '../../features/dashboard/components/Integrations';

const page = () => {
  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12">
        <ProfileWelcome />
      </div>
      <div className="col-span-12">
        <TopCards />
      </div>
      <div className="lg:col-span-8 col-span-12">
        <Activities />
      </div>
      <div className="lg:col-span-4 col-span-12">
        <ChannelBreakdown />
      </div>
      <div className="lg:col-span-7 col-span-12">
        <RecentNotifications />
      </div>
      <div className="lg:col-span-5 col-span-12 flex">
        <TopWorkflows />
      </div>
      <div className="lg:col-span-8 col-span-12">
        <DeliveryPerformance />
      </div>
      <div className="lg:col-span-4 col-span-12">
        <IntegrationsCard />
      </div>
    </div>
  );
};

export default page;
