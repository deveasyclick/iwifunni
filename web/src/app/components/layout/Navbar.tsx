import { Button } from "@/components/ui/button";
import FullLogo from "../shared/FullLogo";

export default function Navbar() {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-border">
      <div className="flex items-center gap-2 text-lg font-semibold">
        <FullLogo />
      </div>

      <div className="hidden md:flex gap-6 text-sm text-muted-foreground">
        <span>Features</span>
        <span>Docs</span>
        <span>Pricing</span>
        <span>Self-hosted</span>
      </div>

      <div className="flex gap-3">
        <a
          href="/auth/login"
          className="flex gap-0.5 items-center justify-center px-4 py-2 rounded-md"
        >
          Sign in
        </a>
        <a
          href="/auth/register"
          className="flex gap-0.5 items-center justify-center bg-primary px-4 py-2 rounded-md hover:bg-primaryemphasis"
        >
          Get started
        </a>
      </div>
    </div>
  );
}
