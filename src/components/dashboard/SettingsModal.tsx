"use client";

import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  KeyRound,
  Loader2,
  Mail,
  Moon,
  Pencil,
  Store,
  Sun,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { readError } from "@/lib/client";
import type { Business, DigestFrequency, SafeUser } from "@/lib/types";

type Tab = "account" | "businesses" | "billing" | "email" | "appearance";

const TABS: Array<{ key: Tab; label: string; icon: typeof UserRound }> = [
  { key: "account", label: "Account", icon: UserRound },
  { key: "businesses", label: "Businesses", icon: Store },
  { key: "billing", label: "Billing", icon: CreditCard },
  { key: "email", label: "Email updates", icon: Mail },
  { key: "appearance", label: "Appearance", icon: Moon },
];

const FREQUENCIES: Array<{ value: DigestFrequency; label: string; blurb: string }> = [
  { value: "daily", label: "Daily", blurb: "A quick note every morning with yesterday's numbers." },
  { value: "weekly", label: "Weekly", blurb: "Every Monday: how all your campaigns did last week. (Most popular)" },
  { value: "monthly", label: "Monthly", blurb: "One tidy report at the start of each month." },
];

export default function SettingsModal({
  user,
  businesses,
  onEditBusiness,
  onAddBusiness,
  onClose,
}: {
  user: SafeUser;
  businesses: Business[];
  /** Opens the full business editor (the settings modal closes first). */
  onEditBusiness: (business: Business) => void;
  /** Opens the add-business form (the settings modal closes first). */
  onAddBusiness: () => void;
  onClose: () => void;
}) {
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

  // email prefs
  const [emailsEnabled, setEmailsEnabled] = useState(user.emailPrefs?.enabled ?? true);
  const [frequency, setFrequency] = useState<DigestFrequency>(
    user.emailPrefs?.digestFrequency ?? "weekly"
  );

  // delete account
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  // password reset via email
  const [resetSending, setResetSending] = useState(false);
  const [resetNotice, setResetNotice] = useState<string | null>(null);
  const [resetDevUrl, setResetDevUrl] = useState<string | null>(null);

  // dark mode
  const [darkMode, setDarkMode] = useState(false);
  useEffect(() => {
    setDarkMode(document.documentElement.classList.contains("dark"));
  }, []);
  function toggleDarkMode(next: boolean) {
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("adpilot_theme", next ? "dark" : "light");
    } catch {
      // private browsing — theme just won't persist
    }
  }

  async function sendResetEmail() {
    setResetSending(true);
    setResetNotice(null);
    setResetDevUrl(null);
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });
      const data = (await res.json()) as { message?: string; devResetUrl?: string };
      setResetNotice(data.message ?? "Check your inbox for the reset link.");
      setResetDevUrl(data.devResetUrl ?? null);
    } catch {
      setResetNotice("Couldn't reach the server. Please try again.");
    } finally {
      setResetSending(false);
    }
  }

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
      if (!res.ok) {
        setMessage({ ok: false, text: await readError(res) });
      } else {
        setMessage({ ok: true, text: "Saved!" });
        router.refresh();
      }
    } catch {
      setMessage({ ok: false, text: "No connection — check your internet and try again." });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (res.ok) {
        window.location.href = "/";
      } else {
        setMessage({ ok: false, text: "Deletion failed — please try again." });
        setDeleting(false);
      }
    } catch {
      setMessage({ ok: false, text: "Couldn't reach the server." });
      setDeleting(false);
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
            <>
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

              {/* password reset */}
              <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5">
                <p className="flex items-center gap-2 text-sm font-bold text-navy-900">
                  <KeyRound size={15} className="text-emerald-600" />
                  Change password
                </p>
                <p className="mt-1.5 text-sm text-slate-600">
                  For security, password changes go through your email — we&apos;ll send a
                  confirmation link to <span className="font-semibold">{user.email}</span>.
                </p>
                <button
                  type="button"
                  disabled={resetSending}
                  onClick={sendResetEmail}
                  className="mt-3 flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-500 hover:text-emerald-700 disabled:opacity-60"
                >
                  {resetSending && <Loader2 size={14} className="animate-spin" />}
                  Email me a password reset link
                </button>
                {resetNotice && (
                  <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-900">
                    {resetNotice}
                  </p>
                )}
                {resetDevUrl && (
                  <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900">
                    Email sending isn&apos;t connected yet, so here&apos;s the link directly:{" "}
                    <Link href={resetDevUrl} className="font-semibold underline">
                      Reset my password
                    </Link>
                  </p>
                )}
              </div>

              {/* danger zone */}
              <div className="mt-8 rounded-xl border border-rose-200 bg-rose-50/50 p-5">
                <p className="flex items-center gap-2 text-sm font-bold text-rose-800">
                  <AlertTriangle size={15} />
                  Delete account
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-rose-700">
                  Permanently removes your account, all businesses, and all campaigns. There is
                  no undo. Type <span className="font-bold">DELETE</span> to confirm.
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder="Type DELETE"
                    className="w-full rounded-xl border border-rose-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:ring-4 focus:ring-rose-100 sm:max-w-[200px]"
                  />
                  <button
                    type="button"
                    disabled={deleteConfirm !== "DELETE" || deleting}
                    onClick={handleDelete}
                    className="flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {deleting && <Loader2 size={15} className="animate-spin" />}
                    Delete my account forever
                  </button>
                </div>
              </div>
            </>
          )}

          {tab === "businesses" && (
            <div>
              <p className="text-sm font-semibold text-navy-900">Your businesses</p>
              <p className="mt-1 text-sm text-slate-500">
                Your agent reads each profile when writing ads and designing visuals —
                a filled-in description makes a real difference.
              </p>
              <ul className="mt-4 space-y-3">
                {businesses.map((b) => {
                  const complete = Boolean(b.description.trim() && b.address.trim());
                  return (
                    <li
                      key={b.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-navy-900">{b.name}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{b.category}</p>
                        {complete ? (
                          <p className="mt-1 flex items-center gap-1 text-xs font-medium text-emerald-700">
                            <CheckCircle2 size={12} /> Profile complete
                          </p>
                        ) : (
                          <p className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-600">
                            <AlertTriangle size={12} /> Add a description &amp; address to improve your ads
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => onEditBusiness(b)}
                        className="flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:border-navy-400 hover:text-navy-900"
                      >
                        <Pencil size={13} />
                        Edit
                      </button>
                    </li>
                  );
                })}
                {businesses.length === 0 && (
                  <li className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-400">
                    No businesses yet.
                  </li>
                )}
              </ul>
              <button
                type="button"
                onClick={onAddBusiness}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm font-semibold text-slate-500 transition hover:border-emerald-400 hover:text-emerald-700"
              >
                <Store size={15} />
                Add another business
              </button>
            </div>
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

          {tab === "email" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void save({ emailPrefs: { enabled: emailsEnabled, digestFrequency: frequency } });
              }}
            >
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5">
                <div>
                  <p className="text-sm font-semibold text-navy-900">Campaign update emails</p>
                  <p className="text-xs text-slate-500">
                    Automated plain-English reports on how all your campaigns are doing.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={emailsEnabled}
                  onClick={() => setEmailsEnabled((v) => !v)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition ${emailsEnabled ? "bg-emerald-600" : "bg-slate-300"}`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${emailsEnabled ? "left-[22px]" : "left-0.5"}`}
                  />
                </button>
              </div>

              <div className={`mt-4 space-y-2 transition ${emailsEnabled ? "" : "pointer-events-none opacity-40"}`}>
                <p className="text-sm font-semibold text-navy-900">How often?</p>
                {FREQUENCIES.map(({ value, label, blurb }) => (
                  <label
                    key={value}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition ${
                      frequency === value
                        ? "border-emerald-400 bg-emerald-50/60"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="digest-frequency"
                      value={value}
                      checked={frequency === value}
                      onChange={() => setFrequency(value)}
                      className="mt-1 h-4 w-4 accent-emerald-600"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-navy-900">{label}</span>
                      <span className="text-xs text-slate-500">{blurb}</span>
                    </span>
                  </label>
                ))}
              </div>

              {!emailsEnabled && (
                <p className="mt-3 text-xs text-slate-400">
                  All non-essential email is off. You&apos;ll still get password resets and billing
                  receipts — those are required to run your account.
                </p>
              )}

              <SaveRow saving={saving} message={message} />
            </form>
          )}

          {tab === "appearance" && (
            <div>
              <p className="text-sm font-semibold text-navy-900">Theme</p>
              <p className="mt-1 text-sm text-slate-500">
                Saved on this device — switches instantly, no reload needed.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => toggleDarkMode(false)}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-5 transition ${
                    !darkMode ? "border-emerald-500 bg-emerald-50/60" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <Sun size={22} className={!darkMode ? "text-emerald-600" : "text-slate-400"} />
                  <span className="text-sm font-semibold text-navy-900">Light</span>
                  <span className="text-xs text-slate-400">Crisp and classic</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleDarkMode(true)}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-5 transition ${
                    darkMode ? "border-emerald-500 bg-emerald-50/60" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <Moon size={22} className={darkMode ? "text-emerald-600" : "text-slate-400"} />
                  <span className="text-sm font-semibold text-navy-900">Dark</span>
                  <span className="text-xs text-slate-400">Easy on the eyes</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 px-6 py-3 text-center text-xs text-slate-400">
          Looking for the legal stuff? <Link href="/terms" className="underline hover:text-navy-700">Terms of Service</Link>{" "}
          and <Link href="/privacy" className="underline hover:text-navy-700">Privacy Policy</Link> now live in the site footer.
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
