import Link from "next/link";
import Logo from "@/components/Logo";
import { getCurrentUser } from "@/lib/auth";

export default async function Navbar() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
          <a href="/#how-it-works" className="transition hover:text-navy-900">
            How it works
          </a>
          <a href="/#pricing" className="transition hover:text-navy-900">
            Pricing
          </a>
        </nav>
        <div className="flex items-center gap-3">
          {user ? (
            <Link
              href="/dashboard"
              className="rounded-xl bg-navy-900 px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-navy-800"
            >
              Open Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:text-navy-900"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-emerald-500"
              >
                Get started free
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
