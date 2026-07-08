import { ArrowRight } from "lucide-react";
import Link from "next/link";
import Footer from "@/components/landing/Footer";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import Navbar from "@/components/landing/Navbar";
import Pricing from "@/components/landing/Pricing";

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <Pricing />

        {/* Final CTA */}
        <section className="bg-navy-900 py-16">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Your next regular is scrolling right now.
            </h2>
            <p className="mt-3 text-lg text-slate-300">
              Give your smart helper five minutes and a budget — it handles the
              rest.
            </p>
            <Link
              href="/signup"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-7 py-3.5 text-base font-semibold text-white shadow-lift transition hover:-translate-y-0.5 hover:bg-emerald-500"
            >
              Launch Your First Ad Free
              <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
