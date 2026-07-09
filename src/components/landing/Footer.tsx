import Link from "next/link";
import Logo from "@/components/Logo";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 px-4 py-10 sm:flex-row sm:px-6">
        <Logo />
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium text-slate-500">
          <a href="/#how-it-works" className="transition hover:text-navy-900">
            How it works
          </a>
          <a href="/#pricing" className="transition hover:text-navy-900">
            Pricing
          </a>
          <Link href="/login" className="transition hover:text-navy-900">
            Log in
          </Link>
          <Link href="/terms" className="transition hover:text-navy-900">
            Terms of Service
          </Link>
          <Link href="/privacy" className="transition hover:text-navy-900">
            Privacy Policy
          </Link>
          <a href="mailto:support@adpilot.example" className="transition hover:text-navy-900">
            Support
          </a>
        </nav>
        <p className="text-sm text-slate-400">
          &copy; {new Date().getFullYear()} AdPilot. Made for main street.
        </p>
      </div>
    </footer>
  );
}
