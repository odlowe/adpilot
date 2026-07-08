import { Megaphone, Search, Target, Type, Users } from "lucide-react";
import type { CampaignPlan } from "@/lib/types";

/**
 * Full transparency on what the agent produced: the copy it wrote and the
 * exact keywords / interest buckets it will target on each platform.
 */
export default function CampaignPreview({ plan }: { plan: CampaignPlan }) {
  const { adCopy, targeting, estMonthlyReach } = plan;
  const [reachLow, reachHigh] = estMonthlyReach;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <div className="border-b border-slate-100 bg-navy-900 px-6 py-4 sm:px-8">
        <h3 className="font-bold text-white">Here&apos;s what your agent built</h3>
        <p className="mt-0.5 text-sm text-slate-300">
          Estimated {reachLow.toLocaleString()}&ndash;{reachHigh.toLocaleString()} neighbors
          reached per month &middot; {targeting.radiusMiles} mile radius
        </p>
      </div>

      <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-2">
        {/* Ad copy */}
        <div className="space-y-6">
          <div>
            <SectionTitle icon={<Type size={15} />} text="Headlines it wrote for you" />
            <ul className="mt-3 space-y-2">
              {adCopy.headlines.map((h) => (
                <li
                  key={h}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-[15px] font-semibold text-navy-900"
                >
                  {h}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <SectionTitle icon={<Megaphone size={15} />} text="Ad descriptions" />
            <ul className="mt-3 space-y-2">
              {adCopy.descriptions.map((d) => (
                <li
                  key={d}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm leading-relaxed text-slate-600"
                >
                  {d}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Targeting */}
        <div className="space-y-6">
          <div>
            <SectionTitle icon={<Target size={15} />} text="Who it will reach" />
            <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-relaxed text-emerald-900">
              {targeting.audienceSummary}
            </p>
          </div>
          <ChipGroup
            icon={<Search size={15} />}
            title="Google — search terms it will bid on"
            chips={targeting.googleKeywords}
            chipClass="bg-blue-50 text-blue-800 ring-blue-200"
          />
          <ChipGroup
            icon={<Users size={15} />}
            title="Instagram & Facebook — interest groups"
            chips={targeting.metaInterests}
            chipClass="bg-rose-50 text-rose-800 ring-rose-200"
          />
          <ChipGroup
            icon={<Users size={15} />}
            title="Reddit — communities & interests"
            chips={targeting.redditInterests}
            chipClass="bg-orange-50 text-orange-800 ring-orange-200"
          />
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
      <span className="text-emerald-600">{icon}</span>
      {text}
    </h4>
  );
}

function ChipGroup({
  icon,
  title,
  chips,
  chipClass,
}: {
  icon: React.ReactNode;
  title: string;
  chips: string[];
  chipClass: string;
}) {
  return (
    <div>
      <SectionTitle icon={icon} text={title} />
      <div className="mt-3 flex flex-wrap gap-2">
        {chips.map((chip) => (
          <span
            key={chip}
            className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${chipClass}`}
          >
            {chip}
          </span>
        ))}
      </div>
    </div>
  );
}
