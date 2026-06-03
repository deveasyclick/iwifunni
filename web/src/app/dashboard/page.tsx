import Activities from './components/dashboard/Activities';
import ChannelBreakdown from './components/dashboard/ChannelBreakdown';
import { TopCards } from './components/dashboard/TopCards';
import ProfileWelcome from './components/dashboard/ProfileWelcome';
import { RecentNotifications } from './components/dashboard/RecentNotifications';
import { TopWorkflows } from './components/dashboard/TopWorkflow';
import DeliveryPerformance from './components/dashboard/DeliveryPerformance';
import IntegrationsCard from './components/dashboard/Integrations';

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
