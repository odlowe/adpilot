import { BRAND } from "@/lib/brand";
import { Navigation } from "lucide-react";
import Link from "next/link";

export default function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-900 text-emerald-400">
        <Navigation size={18} strokeWidth={2.4} />
      </span>
      <span className="text-lg font-bold tracking-tight text-navy-900">
        {BRAND.name.slice(0, 2)}<span className="text-emerald-600">{BRAND.name.slice(2)}</span>
      </span>
    </Link>
  );
}
