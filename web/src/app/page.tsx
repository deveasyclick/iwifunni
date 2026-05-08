"use client";

import { Button } from "@/components/ui/button";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import Hero from "./components/sections/Hero";
import Channels from "./components/sections/Channels";
import HowItWorks from "./components/sections/HowItWorks";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0b0f1a] text-white">
      <Navbar />
      <Hero />
      <Channels />
      <HowItWorks />
      {/* <CTA /> */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-10 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h3 className="text-xl font-semibold">
              Ready to ship better notifications?
            </h3>
            <p className="text-white/60">
              Join developers building better experiences.
            </p>
          </div>

          <div className="flex gap-4">
            <Button size="lg">
              <a href="/auth/register">Get started</a>
            </Button>
            <Button size="lg" variant="outline">
              Read the docs
            </Button>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
