import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function Navbar() {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
      <div className="flex items-center gap-2 text-lg font-semibold">
        <Image
          src="images/logos/logo-light-204x36.svg"
          alt="logo"
          width={204}
          height={36}
        />
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
