import Link from "next/link";
import { FaGithub, FaGoogle } from "react-icons/fa6";

import { Button } from "@/components/ui/button";

type SocialAuthButtonsProps = {
  helperText?: string;
};

export function SocialAuthButtons({
  helperText = "Or continue with email",
}: SocialAuthButtonsProps) {
  return (
    <div className="mb-6 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Button asChild variant="outline" className="w-full">
          <Link href="/api/auth/social/google">
            <FaGoogle />
            <span>Google</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link href="/api/auth/social/github">
            <FaGithub />
            <span>GitHub</span>
          </Link>
        </Button>
      </div>
      <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        <span>{helperText}</span>
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}