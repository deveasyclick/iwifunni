'use client';

import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Hero from '../components/sections/Hero';
import StatsBar from '../components/sections/StatsBar';
import Channels from '../components/sections/Channels';
import Features from '../components/sections/Features';
import HowItWorks from '../components/sections/HowItWorks';
import Testimonials from '../components/sections/Testimonials';
import Faq from '../components/sections/Faq';

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navbar />
      <Hero />
      <StatsBar />
      <Channels />
      <Features />
      <HowItWorks />
      <Testimonials />
      <Faq />

      {/* CTA */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto bg-linear-to-r from-lightprimary to-lightinfo p-10 md:p-14 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h3 className="text-xl font-semibold">
              Ready to ship better notifications?
            </h3>
            <p className="text-muted-foreground mt-1">
              Join thousands of developers building better experiences.
            </p>
          </div>

          <div className="flex gap-4 shrink-0">
            <a
              href="/auth/register"
              className="flex gap-0.5 items-center justify-center bg-primary px-8 py-3 rounded-md hover:bg-primaryemphasis text-sm font-medium"
            >
              Get started free
            </a>
            <a
              href="https://github.com/deveasyclick/iwifunni"
              target="_blank"
              rel="noopener noreferrer"
              className="flex gap-0.5 items-center justify-center outline outline-primary px-8 py-3 rounded-md hover:bg-primary text-primary hover:text-white text-sm font-medium transition-colors"
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
