import type { Metadata } from "next";
import { Suspense } from "react";
import AuthForm from "@/components/auth/AuthForm";
import Footer from "@/components/landing/Footer";
import Logo from "@/components/Logo";

export const metadata: Metadata = { title: "Create your account — AdPilot" };

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-12">
        <Logo />
        <Suspense>
          <AuthForm mode="signup" />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
