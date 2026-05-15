"use client";

import CardBox from "../shared/CardBox";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import FullLogo from "../shared/FullLogo";
import { useRouter } from "next/navigation";

export const Register = () => {
  const router = useRouter();
  const [projectName, setProjectName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          project_name: projectName,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(payload?.error || "Unable to create your account.");
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Unable to create your account right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="h-screen w-full flex justify-center items-center bg-lightprimary">
      <div className="md:min-w-112.5 min-w-max">
        <CardBox>
          <div className="flex justify-center mb-4">
            <FullLogo />
          </div>
          <p className="text-sm text-muted-foreground text-center mb-6">
            Your Social Campaigns
          </p>
          <form onSubmit={handleSubmit}>
            <div>
              <div className="mb-2 block">
                <Label htmlFor="projectName" className="font-medium">
                  Project name
                </Label>
              </div>
              <Input
                id="projectName"
                type="text"
                placeholder="Enter your project name"
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                required
              />
            </div>
            <div className="mt-6">
              <div className="mb-2 block">
                <Label htmlFor="email" className="font-medium">
                  Email
                </Label>
              </div>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="mt-6">
              <div className="mb-2 block">
                <Label htmlFor="password" className="font-medium">
                  Password
                </Label>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            {error ? (
              <p className="mt-4 text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <Button className="w-full mt-6" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Signing Up..." : "Sign Up"}
            </Button>
          </form>
          <div className="flex items center gap-2 justify-center mt-6 flex-wrap">
            <p className="text-base font-medium text-muted-foreground">
              Already have an account?
            </p>
            <Link
              href="/auth/login"
              className="text-sm font-medium text-primary hover:text-primaryemphasis"
            >
              Sign In
            </Link>
          </div>
        </CardBox>
      </div>
    </div>
  );
};
