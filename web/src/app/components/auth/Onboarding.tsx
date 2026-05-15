"use client";

import CardBox from "../shared/CardBox";
import { FormEvent, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import FullLogo from "../shared/FullLogo";
import { useRouter } from "next/navigation";

export const Onboarding = () => {
  const router = useRouter();
  const [projectName, setProjectName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ project_name: projectName }),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        setError(payload?.error || "Unable to complete onboarding.");
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Unable to complete onboarding right now.");
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
            Name your project to finish setting up your workspace.
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
                placeholder="Acme Notifications"
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                required
              />
            </div>
            {error ? (
              <p className="mt-4 text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <Button className="w-full mt-6" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Finishing..." : "Finish Setup"}
            </Button>
          </form>
        </CardBox>
      </div>
    </div>
  );
};