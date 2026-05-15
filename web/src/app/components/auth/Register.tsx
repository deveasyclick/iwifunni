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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
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
          first_name: firstName,
          last_name: lastName,
          email,
          password,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(payload?.error || "Unable to create your account.");
        return;
      }

      const payload = (await response.json().catch(() => null)) as {
        email?: string;
      } | null;
      const nextEmail = payload?.email || email;

      router.replace(`/auth/verify?email=${encodeURIComponent(nextEmail)}`);
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
            Create your account, then verify your email before accessing the dashboard.
          </p>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <div className="mb-2 block">
                  <Label htmlFor="firstName" className="font-medium">
                    First name
                  </Label>
                </div>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Ada"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  required
                />
              </div>
              <div>
                <div className="mb-2 block">
                  <Label htmlFor="lastName" className="font-medium">
                    Last name
                  </Label>
                </div>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Lovelace"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  required
                />
              </div>
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
          <div className="grid gap-3 mt-6">
            <Button asChild variant="outline" className="w-full">
              <Link href="/api/auth/social/google">Continue with Google</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/api/auth/social/github">Continue with GitHub</Link>
            </Button>
          </div>
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
