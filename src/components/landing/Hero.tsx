import { ShieldCheck, Sparkles } from "lucide-react";
import HeroConfigurator from "./HeroConfigurator";
import HeroVideo from "./HeroVideo";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-white">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(700px 380px at 80% 10%, rgba(5,150,105,0.08), transparent), radial-gradient(600px 340px at 10% 90%, rgba(11,31,58,0.06), transparent)",
        }}
      />
      <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
        <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-12">
          {/* Copy + video */}
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <Sparkles size={13} />
              Your Automated AI Marketing Agent
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight text-navy-900 sm:text-5xl">
              Get Local Customers on Autopilot.{" "}
              <span className="text-emerald-600">No Tech Skills Required.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
              Three dials and one sentence. Your smart helper writes, targets,
              and runs your ads on Google, Instagram, and Reddit — all at once.
            </p>
            <div className="mt-8">
              <HeroVideo />
            </div>
            <p className="mt-5 flex items-center gap-1.5 text-sm text-slate-500">
              <ShieldCheck size={15} className="text-emerald-600" />
              No contracts. Pause anytime. Set up in under 5 minutes.
            </p>
          </div>

          {/* The Extreme Simplicity box */}
          <HeroConfigurator />
        </div>
      </div>
    </section>
  );
}
