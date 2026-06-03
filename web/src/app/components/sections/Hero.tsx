import { Icon } from '@iconify/react';
import StatCard from '../utilities/stat-card/StatCard';
import CardBox from '../shared/CardBox';

export default function Hero() {
  return (
    <section className="px-6 py-20 max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
      <div>
        <p className="text-sm text-primary mb-4">Open Source • Self-hostable</p>

        <h1 className="text-4xl md:text-5xl font-bold leading-tight">
          The open-source notification infrastructure for{' '}
          <span className="text-primary">modern apps</span>
        </h1>

        <p className="text-muted-foreground mt-6">
          Iwifunni helps you send, manage, and track notifications across
          in-app, email, SMS, and more — all from a single API.
        </p>

        <div className="flex gap-4 mt-8">
          <a
            href="/auth/register"
            className="flex gap-0.5 items-center justify-center bg-primary px-8 py-3 rounded-md hover:bg-bg-primaryemphasis"
          >
            Get started
          </a>
          <a
            href="https://github.com/deveasyclick/iwifunni"
            target="_blank"
            rel="noopener noreferrer"
            className="flex gap-0.5 items-center justify-center outline outline-primary px-8 py-3 rounded-md hover:bg-primary"
          >
            <Icon icon="mdi:github" className="mr-2" />
            Star on GitHub
          </a>
        </div>

        <div className="flex gap-6 mt-6 text-sm text-muted-foreground">
          <span>Developer-first</span>
          <span>Self-hostable</span>
          <span>Easy to scale</span>
        </div>
      </div>

      {/* Dashboard mock */}
      <CardBox className="bg-lightprimary">
        <CardContent className="p-6 space-y-4">
          <div className="text-sm text-white/70">Welcome back, John 👋</div>

          <div className="grid grid-cols-2 gap-4">
            <StatCard title="Notifications" value="23.4k" />
            <StatCard title="Delivered" value="98.6%" />
            <StatCard title="Subscribers" value="12.6k" />
            <StatCard title="Workflows" value="8" />
          </div>

          <div className="h-32 bg-linear-to-r from-lightprimary to-lightinfo rounded-xl" />
        </CardContent>
      </CardBox>
    </section>
  );
}
