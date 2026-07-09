import type { Metadata } from "next";
import Footer from "@/components/landing/Footer";
import Navbar from "@/components/landing/Navbar";
import { TERMS_PARAGRAPHS } from "@/lib/legal";

export const metadata: Metadata = { title: "Terms of Service — AdPilot" };

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-navy-900">Terms of Service</h1>
        <p className="mt-2 text-sm text-slate-400">
          Early-access template — under legal review. Questions? Just ask us.
        </p>
        <div className="mt-8 space-y-5">
          {TERMS_PARAGRAPHS.map((p) => (
            <p key={p.slice(0, 24)} className="leading-relaxed text-slate-600">
              {p}
            </p>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
