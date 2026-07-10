"use client";

import { Loader2, Lock, Mail, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { readError } from "@/lib/client";

interface AuthFormProps {
  mode: "signup" | "login";
}

const COPY = {
  signup: {
    title: "Let's get you set up",
    subtitle: "One minute now, customers on autopilot after.",
    button: "Create my free account",
    switchText: "Already have an account?",
    switchLabel: "Log in",
    switchHref: "/login",
    passwordAutoComplete: "new-password",
  },
  login: {
    title: "Welcome back",
    subtitle: "Your campaigns missed you.",
    button: "Log in",
    switchText: "New to AdPilot?",
    switchLabel: "Create a free account",
    switchHref: "/signup",
    passwordAutoComplete: "current-password",
  },
} as const;

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const copy = COPY[mode];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "signup" ? { fullName, email, password } : { email, password }),
      });
      if (!res.ok) {
        setError(await readError(res));
        setSubmitting(false);
        return;
      }
      const next = searchParams.get("next");
      router.push(mode === "signup" ? "/onboarding" : next || "/dashboard");
      router.refresh();
    } catch {
      setError("No connection — check your internet and try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-card">
      <h1 className="text-2xl font-extrabold tracking-tight text-navy-900">{copy.title}</h1>
      <p className="mt-1.5 text-slate-500">{copy.subtitle}</p>

      <form onSubmit={handleSubmit} className="mt-7 space-y-4">
        {mode === "signup" && (
          <div>
            <label htmlFor="fullName" className="text-sm font-semibold text-navy-900">
              Full name
            </label>
            <div className="relative mt-1.5">
              <UserRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="fullName"
                type="text"
                required
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g., Dana Rivera"
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3.5 text-[15px] outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </div>
          </div>
        )}
        <div>
          <label htmlFor="email" className="text-sm font-semibold text-navy-900">
            Email
          </label>
          <div className="relative mt-1.5">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yourbusiness.com"
              className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3.5 text-[15px] outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-semibold text-navy-900">
              Password
            </label>
            {mode === "login" && (
              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-emerald-700 hover:underline"
              >
                Forgot password?
              </Link>
            )}
          </div>
          <div className="relative mt-1.5">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete={copy.passwordAutoComplete}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3.5 text-[15px] outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
          </div>
        </div>

        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-base font-semibold text-white shadow-card transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting && <Loader2 size={18} className="animate-spin" />}
          {copy.button}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        {copy.switchText}{" "}
        <Link href={copy.switchHref} className="font-semibold text-emerald-700 hover:underline">
          {copy.switchLabel}
        </Link>
      </p>
    </div>
  );
}
