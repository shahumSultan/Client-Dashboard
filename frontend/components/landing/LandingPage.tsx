import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BrandMark } from "@/components/shared/BrandMark";
import { ParticleMark } from "@/components/brand/ParticleMark";
import { ParticleWave } from "@/components/brand/ParticleWave";

/**
 * The portal's front door. It works as a door: the first viewport holds a
 * working sign-in (the address carries into Clerk's form), the cube assembles
 * beside it, and everything below explains what's inside for first-time
 * invitees. No feature cards, no product screenshot: the site's grammar.
 */

const INSIDE = [
  {
    title: "A live project timeline",
    body: "Every phase, in order - finished, in progress, and still ahead. No more asking for a status update.",
  },
  {
    title: "Comment on any piece of work",
    body: "Leave a remark on a milestone, an update or a delivered file. We reply in the same thread.",
  },
  {
    title: "Deliverables in one place",
    body: "Every file we hand over, versioned and downloadable, attached to the milestone it belongs to.",
  },
  {
    title: "Results you can measure",
    body: "Leads, conversions and revenue attributed to the work - reported against the periods that matter.",
  },
  {
    title: "Told, not chased",
    body: "Notifications when a milestone lands, a request moves, or someone replies to you.",
  },
  {
    title: "Your workspace only",
    body: "Every project, file and comment is scoped to your organization. Nobody else can see it.",
  },
];

const STEPS = [
  {
    title: "We invite you",
    body: "You get an invitation at your work email - no sign-up form to fill in.",
  },
  {
    title: "Your project is waiting",
    body: "Timeline, milestones and deliverables, set up before you arrive.",
  },
  {
    title: "Follow along and weigh in",
    body: "Watch progress, leave remarks, and get replies from the team.",
  },
];

function PrimaryAction({ isSignedIn }: { isSignedIn: boolean }) {
  if (isSignedIn) {
    return (
      <Link
        href="/dashboard"
        className="ec-cta inline-flex h-14 items-center gap-3 bg-brand px-6 text-[17px] font-bold text-white transition-colors hover:bg-brand-hover"
      >
        Open your portal
        <ArrowRight size={18} aria-hidden="true" />
      </Link>
    );
  }
  return (
    // A plain GET form: works before hydration and without JavaScript, and
    // hands the address to /sign-in, which pre-fills Clerk's field with it.
    <form action="/sign-in" method="get" className="w-full max-w-[640px]">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
        <label className="flex-1">
          <span className="text-sm font-medium text-fg-strong">Work email</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            placeholder="you@company.com"
            className="mt-3 h-12 w-full border-0 border-b border-hairline-strong bg-transparent px-0 text-[17px] text-fg placeholder:text-subtle transition-colors hover:border-muted focus:border-brand focus:outline-none"
          />
        </label>
        <button
          type="submit"
          className="ec-cta inline-flex h-14 shrink-0 cursor-pointer items-center justify-between gap-3 bg-brand px-6 text-[17px] font-bold text-white transition-colors hover:bg-brand-hover sm:justify-start"
        >
          Continue
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
      <p className="mt-4 text-sm text-subtle">
        Invite-only. Use the address your invitation was sent to.
      </p>
    </form>
  );
}

export function LandingPage({ isSignedIn }: { isSignedIn: boolean }) {
  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <header className="mx-auto max-w-[1440px] px-4 sm:px-10 lg:px-16">
        <div className="flex h-[72px] items-center justify-between border-b border-hairline">
          <span className="flex items-center gap-4">
            <BrandMark />
            <span className="label-system hidden sm:inline">client portal</span>
          </span>
          <a href="https://enigma-cube.com" className="link-signal text-sm">
            Back to enigma-cube.com
          </a>
        </div>
      </header>

      <main>
        {/* ── The threshold ─────────────────────────────────────────────── */}
        <section className="relative mx-auto grid min-h-[calc(100dvh-72px)] max-w-[1440px] items-center gap-10 px-4 pb-44 pt-14 sm:px-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:px-16 lg:pt-10">
          <div className="relative z-10">
            <h1 className="animate-fade-up text-balance font-display text-[clamp(3.25rem,6.6vw,6rem)] font-light leading-[0.95] tracking-[-0.02em] text-fg-strong">
              Your project,
              <br />
              <em className="italic">in one place.</em>
            </h1>
            <div className="mt-12 animate-fade-up [animation-delay:120ms] sm:mt-14">
              <PrimaryAction isSignedIn={isSignedIn} />
            </div>
          </div>

          <div className="relative mx-auto aspect-[389/416] w-full max-w-[220px] sm:max-w-[340px] lg:max-w-[440px]">
            <ParticleMark density={0.6} />
          </div>

          {/* The site's wave: a lit field carrying the lower part of the hero, not a strip. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[44%] min-h-64 [mask-image:linear-gradient(to_bottom,#000_62%,transparent_86%)]">
            <ParticleWave intensity={1.6} />
          </div>
          <p className="label-system absolute bottom-8 left-4 right-4 z-10 flex gap-x-2 [text-shadow:0_0_10px_#0d0d0d,0_0_4px_#0d0d0d] sm:left-10 sm:gap-x-4 lg:left-16">
            <span>milestones</span>
            <span aria-hidden="true">·</span>
            <span>deliverables</span>
            <span aria-hidden="true">·</span>
            <span>invoices</span>
            <span aria-hidden="true">·</span>
            <span>comments</span>
          </p>
        </section>

        {/* ── What's inside ──────────────────────────────────────────────── */}
        <section className="border-t border-hairline">
          <div className="mx-auto grid max-w-[1440px] gap-12 px-4 py-24 sm:px-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:px-16 lg:py-36">
            <div>
              <h2 className="text-balance font-display text-[clamp(2.25rem,4vw,3.75rem)] font-light leading-[1] tracking-[-0.02em] text-fg-strong">
                What&apos;s <em className="italic">inside.</em>
              </h2>
              <p className="mt-6 max-w-sm text-[17px] leading-relaxed text-muted">
                Built so you never have to email us asking how it&apos;s going.
              </p>
            </div>
            <ul className="border-t border-hairline-strong">
              {INSIDE.map((item) => (
                <li
                  key={item.title}
                  className="grid gap-2 border-b border-hairline py-7 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] sm:gap-10"
                >
                  <h3 className="font-display text-[1.375rem] font-normal leading-snug text-fg-strong">
                    {item.title}
                  </h3>
                  <p className="text-[15px] leading-relaxed text-muted">
                    {item.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Getting started ────────────────────────────────────────────── */}
        <section className="border-t border-hairline">
          <div className="mx-auto max-w-[1440px] px-4 py-24 sm:px-10 lg:px-16 lg:py-32">
            <h2 className="max-w-2xl text-balance font-display text-[clamp(2.25rem,4vw,3.75rem)] font-light leading-[1] tracking-[-0.02em] text-fg-strong">
              Getting <em className="italic">started.</em>
            </h2>
            <ol className="mt-16 grid gap-10 md:grid-cols-3 md:gap-8">
              {STEPS.map((s) => (
                <li
                  key={s.title}
                  className="relative border-t border-hairline-strong pt-8"
                >
                  <span
                    className="signal-square absolute -top-[3.5px] left-0"
                    aria-hidden="true"
                  />
                  <h3 className="font-display text-[1.375rem] font-normal leading-snug text-fg-strong">
                    {s.title}
                  </h3>
                  <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-muted">
                    {s.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Close ──────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden border-t border-hairline">
          <div className="relative z-10 mx-auto max-w-[1440px] px-4 py-28 text-center sm:px-10 lg:px-16 lg:py-40">
            <h2 className="mx-auto max-w-3xl text-balance font-display text-[clamp(2.5rem,5vw,4.75rem)] font-light leading-[0.98] tracking-[-0.02em] text-fg-strong">
              Ready when <em className="italic">you are.</em>
            </h2>
            <p className="mx-auto mt-6 max-w-md text-[17px] leading-relaxed text-muted">
              Enigma-Cube invites clients directly. Sign in with the address
              your invitation was sent to.
            </p>
            <Link
              href={isSignedIn ? "/dashboard" : "/sign-in"}
              className="ec-cta mt-10 inline-flex h-14 items-center gap-3 bg-brand px-6 text-[17px] font-bold text-white transition-colors hover:bg-brand-hover"
            >
              {isSignedIn ? "Open your portal" : "Sign in"}
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 opacity-50">
            <ParticleWave rows={36} cols={120} />
          </div>
        </section>
      </main>

      <footer className="border-t border-hairline">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-4 py-8 sm:px-10 lg:px-16">
          <BrandMark />
          <p className="label-system">
            © {new Date().getFullYear()} enigma-cube
          </p>
        </div>
      </footer>
    </div>
  );
}
