import type { Metadata } from "next";
import { Suspense } from "react";
import AuthForm from "@/components/auth/AuthForm";
import Logo from "@/components/Logo";

export const metadata: Metadata = { title: "Log in — AdPilot" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-slate-50 px-4 py-12">
      <Logo />
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </main>
  );
}
