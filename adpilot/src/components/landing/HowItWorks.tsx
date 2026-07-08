import { MessageSquareText, Rocket, SlidersHorizontal } from "lucide-react";

const STEPS = [
  {
    icon: SlidersHorizontal,
    step: "Step 1",
    title: "Set Your Budget Slider",
    body: "Pick any amount from $100 to $5,000 a month. One slider — that's the whole setup. Your smart helper spreads it across platforms so every dollar works hard.",
  },
  {
    icon: MessageSquareText,
    step: "Step 2",
    title: "Describe Your Customer in Plain English",
    body: 'Type it the way you\'d say it: "moms nearby who love eco-friendly clothing." Your automated agent turns that into professional ad copy and precise targeting.',
  },
  {
    icon: Rocket,
    step: "Step 3",
    title: "Hit Launch",
    body: "Review what the agent wrote, then press one button. Your ads go live on Google, Instagram, and Reddit — and the agent keeps tuning them while you run your business.",
  },
] as const;

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 bg-slate-50 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-navy-900 sm:text-4xl">
            Three steps. Zero jargon.
          </h2>
          <p className="mt-3 text-lg text-slate-600">
            If you can order takeout online, you can launch a professional ad
            campaign.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, step, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-slate-200 bg-white p-7 shadow-card transition hover:-translate-y-1 hover:shadow-lift"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy-900 text-emerald-400">
                <Icon size={22} />
              </div>
              <p className="mt-5 text-xs font-bold uppercase tracking-widest text-emerald-600">
                {step}
              </p>
              <h3 className="mt-1.5 text-lg font-bold text-navy-900">{title}</h3>
              <p className="mt-2.5 leading-relaxed text-slate-600">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
