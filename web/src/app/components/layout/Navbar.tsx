import { Button } from "@/components/ui/button";

export default function Navbar() {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
      <div className="flex items-center gap-2 text-lg font-semibold">
        <div className="w-6 h-6 rounded-full bg-blue-500" />
        Iwifunni
      </div>

      <div className="hidden md:flex gap-6 text-sm text-white/70">
        <span>Features</span>
        <span>Docs</span>
        <span>Pricing</span>
        <span>Self-hosted</span>
      </div>

      <div className="flex gap-3">
        <Button variant="ghost">
          <a href="/auth/login">Sign in</a>
        </Button>
        <Button>
          <a href="/auth/register">Get started</a>
        </Button>
      </div>
    </div>
  );
}
