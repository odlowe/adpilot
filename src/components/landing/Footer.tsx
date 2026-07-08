import Link from "next/link";
import Logo from "@/components/Logo";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 px-4 py-10 sm:flex-row sm:px-6">
        <Logo />
        <nav className="flex items-center gap-6 text-sm font-medium text-slate-500">
          <a href="/#how-it-works" className="transition hover:text-navy-900">
            How it works
          </a>
          <a href="/#pricing" className="transition hover:text-navy-900">
            Pricing
          </a>
          <Link href="/login" className="transition hover:text-navy-900">
            Log in
          </Link>
        </nav>
        <p className="text-sm text-slate-400">
          &copy; {new Date().getFullYear()} AdPilot. Made for main street.
        </p>
      </div>
    </footer>
  );
}
