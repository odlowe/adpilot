"use client";

import { CheckCircle2, CreditCard, FileText, Loader2, ShieldCheck, UserRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SafeUser } from "@/lib/types";

type Tab = "account" | "billing" | "terms" | "privacy";

const TABS: Array<{ key: Tab; label: string; icon: typeof UserRound }> = [
  { key: "account", label: "Account", icon: UserRound },
  { key: "billing", label: "Billing", icon: CreditCard },
  { key: "terms", label: "Terms of Service", icon: FileText },
  { key: "privacy", label: "Privacy Policy", icon: ShieldCheck },
];

export default function SettingsModal({ user, onClose }: { user: SafeUser; onClose: () => void }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("account");

  // account form
  const [fullName, setFullName] = useState(user.fullName);
  const [email, setEmail] = useState(user.email);
  const [birthdate, setBirthdate] = useState(user.birthdate ?? "");

  // billing form
  const [nameOnCard, setNameOnCard] = useState(user.billingJson?.nameOnCard ?? "");
  const [cardNumber, setCardNumber] = useState("");
  const [expMonth, setExpMonth] = useState(user.billingJson?.expMonth ?? 1);
  const [expYear, setExpYear] = useState(user.billingJson?.expYear ?? 2027);
  const [billingZip, setBillingZip] = useState(user.billingJson?.billingZip ?? "");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(payload: object) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMessage({ ok: false, text: data.error ?? "Something went wrong." });
      } else {
        setMessage({ ok: true, text: "Saved!" });
        router.refresh();
      }
    } catch {
      setMessage({ ok: false, text: "Couldn't reach the server." });
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-slate-300 px-4 py-2.5 text-[15px] outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";
  const labelClass = "mt-4 block text-sm font-semibold text-navy-900 first:mt-0";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/60 p-4 backdrop-blur-sm sm:p-8">
      <div className="mx-auto w-full max-w-2xl rounded-2xl bg-white shadow-lift">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-bold text-navy-900">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-navy-900"
          >
            <X size={18} />
          </button>
        </div>

        {/* tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-4 pt-3">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setTab(key);
                setMessage(null);
              }}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-t-lg border-b-2 px-3.5 py-2.5 text-sm font-semibold transition ${
                tab === key
                  ? "border-emerald-600 text-navy-900"
                  : "border-transparent text-slate-400 hover:text-navy-700"
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-6 sm:p-7">
          {tab === "account" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void save({ fullName, email, birthdate: birthdate || null });
              }}
            >
              <label className={labelClass} htmlFor="set-name">Full name</label>
              <input id="set-name" type="text" required minLength={2} value={fullName} onChange={(e) => setFullName(e.target.value)} className={`${inputClass} mt-1.5`} />

              <label className={labelClass} htmlFor="set-email">Email</label>
              <input id="set-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={`${inputClass} mt-1.5`} />
              <p className="mt-1 text-xs text-slate-400">This is also your login email.</p>

              <label className={labelClass} htmlFor="set-birthdate">Birthdate</label>
              <input id="set-birthdate" type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} className={`${inputClass} mt-1.5`} />

              <SaveRow saving={saving} message={message} />
            </form>
          )}

          {tab === "billing" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void save({ billing: { nameOnCard, cardNumber, expMonth, expYear, billingZip } });
              }}
            >
              {user.billingJson ? (
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  Card on file: •••• •••• •••• {user.billingJson.cardLast4} (exp{" "}
                  {String(user.billingJson.expMonth).padStart(2, "0")}/{user.billingJson.expYear}).
                  Enter a new card below to replace it.
                </p>
              ) : (
                <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  No payment method saved yet. You won&apos;t be billed until you have a live
                  campaign and confirm your plan.
                </p>
              )}

              <label className={labelClass} htmlFor="set-cardname">Name on card</label>
              <input id="set-cardname" type="text" required value={nameOnCard} onChange={(e) => setNameOnCard(e.target.value)} autoComplete="cc-name" className={`${inputClass} mt-1.5`} />

              <label className={labelClass} htmlFor="set-cardnum">Card number</label>
              <input
                id="set-cardnum"
                type="text"
                required
                inputMode="numeric"
                placeholder="4242 4242 4242 4242"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                autoComplete="cc-number"
                className={`${inputClass} mt-1.5`}
              />

              <div className="mt-4 grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-navy-900" htmlFor="set-expm">Exp. month</label>
                  <input id="set-expm" type="number" min={1} max={12} required value={expMonth} onChange={(e) => setExpMonth(Number(e.target.value))} className={`${inputClass} mt-1.5`} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-navy-900" htmlFor="set-expy">Exp. year</label>
                  <input id="set-expy" type="number" min={2026} max={2045} required value={expYear} onChange={(e) => setExpYear(Number(e.target.value))} className={`${inputClass} mt-1.5`} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-navy-900" htmlFor="set-zip">Billing ZIP</label>
                  <input id="set-zip" type="text" required value={billingZip} onChange={(e) => setBillingZip(e.target.value)} autoComplete="postal-code" className={`${inputClass} mt-1.5`} />
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-400">
                For your security we only keep the last 4 digits on file. Card processing goes
                live with our payments launch — you will never be charged without confirming.
              </p>

              <SaveRow saving={saving} message={message} />
            </form>
          )}

          {tab === "terms" && (
            <LegalText
              title="Terms of Service"
              paragraphs={[
                "Welcome to AdPilot. By creating an account you agree to these terms, which exist to keep things fair for you and for us.",
                "The service: AdPilot creates and manages digital advertising campaigns on your behalf across third-party platforms. You choose the budget; we place the ads. Ad spend goes to the advertising platforms; our management fee is 15% of your chosen ad budget, billed monthly alongside it.",
                "Your responsibilities: you confirm the business information and ad content you provide is accurate, that you have rights to any images or video you upload, and that your ads comply with applicable laws for your industry and location.",
                "Billing and cancellation: plans renew monthly. You can pause or cancel anytime from your dashboard, effective at the end of the current billing cycle. No long-term contracts, no cancellation fees.",
                "Performance: advertising results vary and we do not guarantee specific outcomes such as clicks, customers, or revenue. Estimates shown in the dashboard are projections, not promises.",
                "Liability: to the maximum extent permitted by law, our liability is limited to the management fees you paid in the three months preceding a claim.",
                "We may update these terms; if we do, we will notify you by email before changes take effect.",
              ]}
            />
          )}

          {tab === "privacy" && (
            <LegalText
              title="Privacy Policy"
              paragraphs={[
                "We collect only what we need to run your campaigns: your name, email, business details, campaign settings, and payment information (of which we store only the last four digits of your card).",
                "How we use it: to create and manage your ad campaigns, bill you correctly, and send you service updates. We share campaign data with the advertising platforms (Google, Meta, Reddit) only as required to run your ads.",
                "What we never do: sell your personal information, share your customer descriptions with other businesses, or use your data to compete with you.",
                "Your rights: you can view and edit your information in Settings at any time, export your campaign data on request, and delete your account entirely by contacting support — deletion removes your personal data from our systems within 30 days.",
                "Security: passwords are stored hashed (never in plain text), connections are encrypted, and access to production data is restricted.",
                "Questions? Email us and a human will answer.",
              ]}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function SaveRow({
  saving,
  message,
}: {
  saving: boolean;
  message: { ok: boolean; text: string } | null;
}) {
  return (
    <div className="mt-6 flex items-center gap-3">
      <button
        type="submit"
        disabled={saving}
        className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-card transition hover:bg-emerald-500 disabled:opacity-60"
      >
        {saving && <Loader2 size={15} className="animate-spin" />}
        Save changes
      </button>
      {message && (
        <span
          className={`flex items-center gap-1.5 text-sm font-medium ${
            message.ok ? "text-emerald-700" : "text-rose-600"
          }`}
        >
          {message.ok && <CheckCircle2 size={15} />}
          {message.text}
        </span>
      )}
    </div>
  );
}

function LegalText({ title, paragraphs }: { title: string; paragraphs: string[] }) {
  return (
    <div>
      <h3 className="text-base font-bold text-navy-900">{title}</h3>
      <p className="mt-1 text-xs text-slate-400">
        Template for early access — have a lawyer review before charging customers.
      </p>
      <div className="mt-4 space-y-3.5">
        {paragraphs.map((p) => (
          <p key={p.slice(0, 24)} className="text-sm leading-relaxed text-slate-600">
            {p}
          </p>
        ))}
      </div>
    </div>
  );
}
