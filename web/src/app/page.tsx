'use client';

import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Hero from '../components/sections/Hero';
import Channels from '../components/sections/Channels';
import HowItWorks from '../components/sections/HowItWorks';

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navbar />
      <Hero />
      <Channels />
      <HowItWorks />
      {/* <CTA /> */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto bg-linear-to-r from-lightprimary to-lightinfo p-10 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h3 className="text-xl font-semibold">
              Ready to ship better notifications?
            </h3>
            <p className="text-muted-foreground">
              Join developers building better experiences.
            </p>
          </div>

          <div className="flex gap-4">
            <a
              href="/auth/register"
              className="flex gap-0.5 items-center justify-center bg-primary px-8 py-3 rounded-md hover:bg-primaryemphasis"
            >
              Get started
            </a>
            <a
              href="https://github.com/deveasyclick/iwifunni"
              target="_blank"
              rel="noopener noreferrer"
              className="flex gap-0.5 items-center justify-center outline outline-primary px-8 py-3 rounded-md hover:bg-primary text-primary"
            >
              Read the docs
            </a>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
