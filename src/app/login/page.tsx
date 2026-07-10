import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { Suspense } from "react";
import AuthForm from "@/components/auth/AuthForm";
import Footer from "@/components/landing/Footer";
import Logo from "@/components/Logo";

export const metadata: Metadata = { title: `Log in — ${BRAND.name}` };

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-12">
        <Logo />
        <Suspense>
          <AuthForm mode="login" />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
