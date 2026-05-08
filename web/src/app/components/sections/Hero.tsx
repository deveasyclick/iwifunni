import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@iconify/react";
import StatCard from "../utilities/stat-card/StatCard";

export default function Hero() {
  return (
    <section className="px-6 py-20 max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
      <div>
        <p className="text-sm text-blue-400 mb-4">
          Open Source • Self-hostable
        </p>

        <h1 className="text-4xl md:text-5xl font-bold leading-tight">
          The open-source notification infrastructure for{" "}
          <span className="text-blue-400">modern apps</span>
        </h1>

        <p className="text-white/70 mt-6">
          Iwifunni helps you send, manage, and track notifications across
          in-app, email, SMS, and more — all from a single API.
        </p>

        <div className="flex gap-4 mt-8">
          <Button size="lg">
            <a href="/auth/register">Get started</a>
          </Button>
          <Button size="lg" variant="outline">
            <a
              href="https://github.com/deveasyclick/iwifunni"
              target="_blank"
              rel="noopener noreferrer"
              className="flex gap-0.5 items-center"
            >
              <Icon icon="mdi:github" className="mr-2" />
              Star on GitHub
            </a>
          </Button>
        </div>

        <div className="flex gap-6 mt-6 text-sm text-white/60">
          <span>Developer-first</span>
          <span>Self-hostable</span>
          <span>Easy to scale</span>
        </div>
      </div>

      {/* Dashboard mock */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-6 space-y-4">
          <div className="text-sm text-white/70">Welcome back, John 👋</div>

          <div className="grid grid-cols-2 gap-4">
            <StatCard title="Notifications" value="23.4k" />
            <StatCard title="Delivered" value="98.6%" />
            <StatCard title="Subscribers" value="12.6k" />
            <StatCard title="Workflows" value="8" />
          </div>

          <div className="h-32 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl" />
        </CardContent>
      </Card>
    </section>
  );
}
