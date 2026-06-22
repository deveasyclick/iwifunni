'use client';

import { useState } from 'react';
import { useDashboardStats } from '../../features/dashboard/queries';
import { useUserProfile } from '../../features/auth/queries';
import Activities from '../../features/dashboard/components/Activities';
import ChannelBreakdown from '../../features/dashboard/components/ChannelBreakdown';
import { TopCards } from '../../features/dashboard/components/TopCards';
import ProfileWelcome from '../../features/dashboard/components/ProfileWelcome';
import { RecentNotifications } from '../../features/dashboard/components/RecentNotifications';
import { TopWorkflows } from '../../features/dashboard/components/TopWorkflow';
import DeliveryPerformance from '../../features/dashboard/components/DeliveryPerformance';
import IntegrationsCard from '../../features/dashboard/components/Integrations';

const DashboardPage = () => {
  const [days, setDays] = useState(7);
  const { data: profile } = useUserProfile();
  const { data: stats, isLoading } = useDashboardStats(days);

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12">
        <ProfileWelcome firstName={profile?.first_name} isLoading={!profile} />
      </div>
      <div className="col-span-12">
        <TopCards stats={stats?.counts} isLoading={isLoading} />
      </div>
      <div className="lg:col-span-8 col-span-12">
        <Activities
          data={stats?.daily_activity}
          isLoading={isLoading}
          days={days}
          onDaysChange={setDays}
        />
      </div>
      <div className="lg:col-span-4 col-span-12">
        <ChannelBreakdown
          data={stats?.channel_breakdown}
          isLoading={isLoading}
        />
      </div>
      <div className="lg:col-span-7 col-span-12">
        <RecentNotifications
          data={stats?.recent_notifications}
          isLoading={isLoading}
        />
      </div>
      <div className="lg:col-span-5 col-span-12 flex">
        <TopWorkflows />
      </div>
      <div className="lg:col-span-8 col-span-12">
        <DeliveryPerformance
          stats={stats?.notification_stats}
          totalNotifications={stats?.counts.total_notifications}
          isLoading={isLoading}
        />
      </div>
      <div className="lg:col-span-4 col-span-12">
        <IntegrationsCard
          activeProviders={stats?.active_providers}
          count={stats?.counts.active_providers}
        />
      </div>
    </div>
  );
};

export default DashboardPage;
