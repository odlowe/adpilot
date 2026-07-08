import {
  ArrowBigDown,
  ArrowBigUp,
  Heart,
  MessageCircle,
  MessageSquare,
  Search,
  Send,
  Share2,
} from "lucide-react";

/**
 * The "Ad Journey" — a looping, pure-CSS animated scene (keyframes live in
 * globals.css, all transform/opacity so it stays smooth on mobile):
 *
 *   Scene 1  A printed flyer resting on a wooden table.
 *   Bridge   The flyer lifts off and becomes a clean digital ad card.
 *   Scene 2  The card splits into three copies that fly into live
 *            placements: Google Search, an Instagram feed, and Reddit.
 *
 * The scene is composed at a fixed 640x440 and scaled per breakpoint via
 * the .hero-scene-wrap CSS variable, so positions stay pixel-perfect.
 */
export default function HeroAnimation() {
  return (
    <div aria-hidden="true" className="select-none">
      <div className="hero-scene-wrap overflow-hidden">
        <div className="hero-scene">
          {/* ---- Scene 2: platform mockups (top row) ---- */}
          <div className="ap-anim ap-anim-mock absolute left-0 top-0 w-[196px]">
            <GoogleMock />
          </div>
          <div className="ap-anim ap-anim-mock absolute left-[222px] top-0 w-[196px]">
            <InstagramMock />
          </div>
          <div className="ap-anim ap-anim-mock absolute left-[444px] top-0 w-[196px]">
            <RedditMock />
          </div>

          {/* ---- Scene 1: the wooden table ---- */}
          <div className="ap-anim ap-anim-table absolute inset-x-2 bottom-0 h-[140px]">
            <WoodenTable />
          </div>

          {/* ---- The printed flyer on the table ---- */}
          <div className="ap-anim ap-anim-flyer absolute left-[235px] top-[292px] w-[170px]">
            <PaperFlyer />
          </div>

          {/* ---- The digital card it becomes (hovers where the flyer rose to) ---- */}
          <div className="ap-anim ap-anim-card absolute left-[235px] top-[292px] w-[170px] opacity-0">
            <DigitalCard />
          </div>

          {/* ---- Three clones that fly into the placements ---- */}
          <div className="ap-anim ap-anim-clone-l absolute left-[235px] top-[162px] w-[170px] opacity-0">
            <MiniCard />
          </div>
          <div className="ap-anim ap-anim-clone-c absolute left-[235px] top-[162px] w-[170px] opacity-0">
            <MiniCard />
          </div>
          <div className="ap-anim ap-anim-clone-r absolute left-[235px] top-[162px] w-[170px] opacity-0">
            <MiniCard />
          </div>
        </div>
      </div>

      {/* Cycling caption */}
      <div className="relative mt-2 h-6 text-center text-sm font-medium text-slate-500">
        <span className="ap-anim ap-anim-caption-a absolute inset-x-0">
          Your ad starts as an idea on the kitchen table…
        </span>
        <span className="ap-anim ap-anim-caption-b absolute inset-x-0 opacity-0">
          …and goes live on Google, Instagram &amp; Reddit. Automatically.
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Scene pieces                                                        */
/* ------------------------------------------------------------------ */

function WoodenTable() {
  return (
    <div
      className="relative h-full w-full rounded-t-[22px] border-t border-amber-500/40 shadow-lift"
      style={{
        background:
          "repeating-linear-gradient(90deg, rgba(0,0,0,0.10) 0 2px, transparent 2px 46px), linear-gradient(180deg, #b45309 0%, #92400e 45%, #78350f 100%)",
      }}
    >
      {/* soft light across the surface */}
      <div className="absolute inset-0 rounded-t-[22px] bg-gradient-to-br from-white/15 via-transparent to-black/15" />
      {/* coffee mug */}
      <div className="absolute right-10 top-6">
        <div className="h-11 w-11 rounded-full border-4 border-stone-100 bg-amber-950 shadow-md" />
        <div className="absolute -right-2.5 top-3 h-5 w-3 rounded-r-full border-4 border-stone-100" />
      </div>
      {/* pencil */}
      <div className="absolute left-10 top-16 h-1.5 w-24 -rotate-6 rounded-full bg-gradient-to-r from-rose-300 via-amber-300 to-stone-700 shadow" />
    </div>
  );
}

function PaperFlyer() {
  return (
    <div className="relative rounded-sm border border-stone-300 bg-stone-50 p-3 shadow-lift">
      {/* tape corners */}
      <div className="absolute -left-2 -top-1.5 h-3.5 w-9 -rotate-45 bg-amber-100/80 shadow-sm" />
      <div className="absolute -right-2 -top-1.5 h-3.5 w-9 rotate-45 bg-amber-100/80 shadow-sm" />
      <p className="text-center text-[9px] font-bold uppercase tracking-[0.2em] text-amber-700">
        Grand Opening
      </p>
      <p className="mt-1 text-center font-serif text-[15px] font-bold leading-tight text-stone-800">
        Main St. Bakery
      </p>
      <p className="mt-0.5 text-center text-[9px] italic text-stone-500">
        Fresh sourdough, baked daily
      </p>
      <div className="my-2 border-t border-dashed border-stone-300" />
      <p className="text-center text-[10px] font-semibold text-stone-700">
        20% off with this flyer
      </p>
      <p className="mt-0.5 text-center text-[8px] text-stone-400">
        142 Main Street &middot; Open 7am&ndash;3pm
      </p>
    </div>
  );
}

function DigitalCard() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lift ring-1 ring-emerald-500/30">
      <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-2.5 py-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        <span className="ml-auto rounded bg-emerald-100 px-1.5 py-px text-[7px] font-bold uppercase tracking-wide text-emerald-700">
          Digital Ad
        </span>
      </div>
      <div className="p-2.5">
        <div className="h-9 rounded-md bg-gradient-to-br from-amber-200 via-amber-300 to-orange-300" />
        <p className="mt-1.5 text-[11px] font-bold leading-tight text-navy-900">
          Main St. Bakery
        </p>
        <p className="text-[8.5px] text-slate-500">Fresh sourdough, baked daily</p>
        <div className="mt-1.5 rounded-md bg-emerald-600 py-1 text-center text-[9px] font-semibold text-white">
          Learn More
        </div>
      </div>
    </div>
  );
}

/** Simplified copy of the digital card used for the flying clones. */
function MiniCard() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-2.5 shadow-lift ring-1 ring-emerald-500/30">
      <div className="h-8 rounded-md bg-gradient-to-br from-amber-200 via-amber-300 to-orange-300" />
      <div className="mt-1.5 h-2 w-3/4 rounded bg-navy-200" />
      <div className="mt-1 h-1.5 w-1/2 rounded bg-slate-200" />
      <div className="mt-1.5 h-4 rounded-md bg-emerald-600" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Platform mockups                                                    */
/* ------------------------------------------------------------------ */

function GoogleMock() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <div className="border-b border-slate-100 px-3 pb-2 pt-3">
        <p className="text-center text-[13px] font-bold tracking-tight">
          <span className="text-blue-500">G</span>
          <span className="text-red-500">o</span>
          <span className="text-amber-500">o</span>
          <span className="text-blue-500">g</span>
          <span className="text-emerald-600">l</span>
          <span className="text-red-500">e</span>
        </p>
        <div className="mt-1.5 flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1">
          <Search size={9} className="shrink-0 text-slate-400" />
          <span className="text-[8.5px] text-slate-600">bakery near me</span>
        </div>
      </div>
      <div className="px-3 py-2.5">
        <p className="text-[8px] font-bold text-slate-800">
          Sponsored
        </p>
        <p className="mt-1 text-[10.5px] font-medium leading-tight text-blue-700">
          Main St. Bakery — Fresh Sourdough Daily
        </p>
        <p className="text-[8px] text-emerald-700">mainstbakery.com</p>
        <p className="mt-0.5 text-[8px] leading-snug text-slate-500">
          Locally owned. Baked fresh every morning. Stop in for 20% off your
          first loaf.
        </p>
        <div className="mt-2 space-y-1.5">
          <div className="h-1.5 w-11/12 rounded bg-slate-100" />
          <div className="h-1.5 w-4/5 rounded bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

function InstagramMock() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <div className="flex items-center gap-1.5 px-2.5 py-2">
        <span className="h-5 w-5 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-500 p-px">
          <span className="block h-full w-full rounded-full border border-white bg-amber-200" />
        </span>
        <div className="leading-none">
          <p className="text-[9px] font-semibold text-slate-800">mainstbakery</p>
          <p className="text-[7px] text-slate-400">Sponsored</p>
        </div>
      </div>
      <div className="flex h-[86px] items-center justify-center bg-gradient-to-br from-amber-200 via-amber-300 to-orange-300">
        <div className="rounded-md bg-white/85 px-2 py-1 text-center shadow-sm">
          <p className="text-[9px] font-bold text-stone-800">Main St. Bakery</p>
          <p className="text-[7px] text-stone-500">Fresh sourdough daily</p>
        </div>
      </div>
      <button
        type="button"
        className="flex w-full items-center justify-between bg-blue-500 px-2.5 py-1.5 text-left text-[9px] font-semibold text-white"
      >
        Learn More <span aria-hidden>&rsaquo;</span>
      </button>
      <div className="flex items-center gap-2 px-2.5 py-1.5 text-slate-700">
        <Heart size={10} />
        <MessageCircle size={10} />
        <Send size={10} />
      </div>
    </div>
  );
}

function RedditMock() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <div className="flex items-center gap-1.5 px-2.5 pt-2.5">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[8px] font-bold text-white">
          r/
        </span>
        <div className="leading-none">
          <p className="text-[9px] font-semibold text-slate-800">r/LocalEats</p>
          <p className="text-[7px] font-medium text-blue-600">Promoted</p>
        </div>
      </div>
      <p className="px-2.5 pt-1.5 text-[9.5px] font-semibold leading-snug text-slate-800">
        The sourdough everyone in town is talking about
      </p>
      <div className="mx-2.5 mt-1.5 h-[62px] rounded-lg bg-gradient-to-br from-amber-200 via-amber-300 to-orange-300" />
      <div className="flex items-center gap-2.5 px-2.5 py-2 text-slate-500">
        <span className="flex items-center gap-0.5 rounded-full bg-slate-100 px-1.5 py-0.5">
          <ArrowBigUp size={10} />
          <span className="text-[8px] font-bold">128</span>
          <ArrowBigDown size={10} />
        </span>
        <span className="flex items-center gap-0.5 text-[8px]">
          <MessageSquare size={9} /> 24
        </span>
        <span className="flex items-center gap-0.5 text-[8px]">
          <Share2 size={9} /> Share
        </span>
      </div>
    </div>
  );
}
