"use client";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  CircleDot,
  Circle,
  MessageSquare,
  GitBranch,
  BarChart3,
  FileText,
  BellRing,
  ShieldCheck,
} from "lucide-react";
import { CubeLogo, BrandMark } from "@/components/shared/BrandMark";

const EASE = [0.16, 1, 0.3, 1] as const;

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  // `initial` was an inline opacity:0 cleared only when an observer fired. With
  // reduced motion — or any time the observer did not run — the section simply
  // never appeared. whileInView drives the observer itself, and reduced motion
  // skips the hidden state entirely rather than relying on it being undone.
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** A miniature of the real product, built from the same glass tokens. */
function PortalPreview() {
  const milestones = [
    { label: "Discovery & scoping", state: "done" },
    { label: "Data pipeline build", state: "done" },
    { label: "Model training", state: "active" },
    { label: "Integration & QA", state: "todo" },
    { label: "Handover", state: "todo" },
  ] as const;

  return (
    <div className="relative pb-28">
      <div
        className="absolute -inset-6 bottom-28 rounded-[32px] bg-brand/20 blur-[70px]"
        aria-hidden="true"
      />
      <div className="glass-strong glass-sheen relative rounded-card-lg p-5 shadow-[0_40px_90px_-40px_rgba(0,0,0,0.95)]">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
              Active project
            </p>
            <p className="mt-1.5 font-semibold tracking-tight text-fg">
              Lead Qualification Engine
            </p>
          </div>
          <span className="rounded-full border border-brand/30 bg-brand-wash px-2.5 py-1 text-[11px] font-medium text-brand-soft">
            In development
          </span>
        </div>

        <div className="mb-5">
          <div className="mb-2 flex items-baseline justify-between text-xs">
            <span className="text-subtle">Overall progress</span>
            <span className="tabular font-semibold text-fg">64%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-brand to-brand-soft"
              initial={{ width: 0 }}
              animate={{ width: "64%" }}
              transition={{ duration: 1.1, delay: 0.4, ease: EASE }}
            />
          </div>
        </div>

        <ul className="space-y-2.5">
          {milestones.map((m) => (
            <li key={m.label} className="flex items-center gap-2.5">
              {m.state === "done" ? (
                <CheckCircle2 size={14} className="shrink-0 text-success" aria-hidden="true" />
              ) : m.state === "active" ? (
                <CircleDot size={14} className="shrink-0 text-brand-soft" aria-hidden="true" />
              ) : (
                <Circle size={14} className="shrink-0 text-faint" aria-hidden="true" />
              )}
              <span
                className={
                  m.state === "done"
                    ? "text-xs text-faint line-through"
                    : m.state === "active"
                      ? "text-xs font-medium text-fg"
                      : "text-xs text-subtle"
                }
              >
                {m.label}
              </span>
              {m.state === "active" && (
                <span className="ml-auto rounded-full bg-brand-wash px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-brand-soft">
                  Now
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Floating comment card — the feature that defines the product */}
      <motion.div
        className="glass-strong absolute bottom-0 left-0 w-60 rounded-card p-3.5 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.9)]"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.9, ease: EASE }}
      >
        <div className="flex items-center gap-2">
          <MessageSquare size={13} className="text-brand-soft" aria-hidden="true" />
          <p className="font-mono text-[9px] uppercase tracking-wider text-faint">
            Your remark
          </p>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">
          &ldquo;Can we add a Slack alert when a lead scores above 80?&rdquo;
        </p>
      </motion.div>
    </div>
  );
}

const FEATURES = [
  {
    icon: GitBranch,
    title: "A live project timeline",
    body: "Every phase, in order — finished, in progress, and still ahead. No more asking for a status update.",
  },
  {
    icon: MessageSquare,
    title: "Comment on any piece of work",
    body: "Leave a remark on a milestone, an update or a delivered file. We reply in the same thread.",
  },
  {
    icon: FileText,
    title: "Deliverables in one place",
    body: "Every file we hand over, versioned and downloadable, attached to the milestone it belongs to.",
  },
  {
    icon: BarChart3,
    title: "Results you can measure",
    body: "Leads, conversions and revenue attributed to the work — reported against the periods that matter.",
  },
  {
    icon: BellRing,
    title: "Told, not chased",
    body: "Notifications when a milestone lands, a request moves, or someone replies to you.",
  },
  {
    icon: ShieldCheck,
    title: "Your workspace only",
    body: "Every project, file and comment is scoped to your organization. Nobody else can see it.",
  },
];

const STEPS = [
  { n: "01", title: "We invite you", body: "You get an invitation at your work email — no sign-up form to fill in." },
  { n: "02", title: "Your project is waiting", body: "Timeline, milestones and deliverables, set up before you arrive." },
  { n: "03", title: "Follow along and weigh in", body: "Watch progress, leave remarks, and get replies from the team." },
];

export function LandingPage({ isSignedIn }: { isSignedIn: boolean }) {
  return (
    <div className="relative">
      <header className="sticky top-0 z-40 border-b border-hairline bg-base/70 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <BrandMark kicker="Client Portal" />
          <nav className="flex items-center gap-2">
            {isSignedIn ? (
              <Link
                href="/dashboard"
                className="glow-brand inline-flex h-10 items-center gap-2 rounded-[10px] bg-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
              >
                Open portal
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            ) : (
              // One CTA: access is invite-only, so there is no separate
              // "get started" path to offer alongside signing in.
              <Link
                href="/sign-in"
                className="glow-brand inline-flex h-10 items-center gap-2 rounded-[10px] bg-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
              >
                Sign in
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden px-6 pb-24 pt-16 sm:pt-24">
          <div className="mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-2">
            <div>
              <motion.p
                className="inline-flex items-center gap-2 rounded-full border border-hairline bg-glass px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-brand-soft"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE }}
              >
                <CubeLogo size={14} />
                Enigma-Cube Client Portal
              </motion.p>

              <motion.h1
                className="mt-6 text-4xl font-semibold leading-[1.08] tracking-tight text-fg sm:text-5xl"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.06, ease: EASE }}
              >
                Know exactly where
                <br />
                your project stands.
              </motion.h1>

              <motion.p
                className="mt-5 max-w-lg text-base leading-relaxed text-muted"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.12, ease: EASE }}
              >
                One place to see what we&apos;ve shipped, what we&apos;re building
                now, and what&apos;s still to come — and to tell us what you think
                as we go.
              </motion.p>

              <motion.div
                className="mt-8 flex flex-wrap items-center gap-3"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.18, ease: EASE }}
              >
                <Link
                  href={isSignedIn ? "/dashboard" : "/sign-in"}
                  className="glow-brand inline-flex h-11 items-center gap-2 rounded-[10px] bg-brand px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
                >
                  {isSignedIn ? "Open your portal" : "Sign in"}
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>

              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: EASE }}
            >
              <PortalPreview />
            </motion.div>
          </div>
        </section>

        <section className="border-t border-hairline px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-fg">
                Everything about your project, in one place
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-subtle">
                Built so you never have to email us asking how it&apos;s going.
              </p>
            </Reveal>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f, i) => (
                <Reveal key={f.title} delay={i * 0.05}>
                  <article className="glass glass-sheen glass-hover h-full rounded-card p-6">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-wash text-brand-soft">
                      <f.icon size={19} strokeWidth={2} aria-hidden="true" />
                    </span>
                    <h3 className="mt-5 font-semibold tracking-tight text-fg">
                      {f.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-subtle">{f.body}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-hairline px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <h2 className="text-3xl font-semibold tracking-tight text-fg">
                Getting started
              </h2>
            </Reveal>

            <div className="mt-12 grid gap-8 sm:grid-cols-3">
              {STEPS.map((s, i) => (
                <Reveal key={s.n} delay={i * 0.08}>
                  <div className="relative">
                    <span className="font-mono text-sm font-medium text-brand-soft">
                      {s.n}
                    </span>
                    <h3 className="mt-3 font-semibold tracking-tight text-fg">
                      {s.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-subtle">{s.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-hairline px-6 py-24">
          <div className="mx-auto max-w-4xl">
            <Reveal>
              <div className="glass-strong glass-sheen relative overflow-hidden rounded-card-lg px-8 py-14 text-center">
                <div
                  className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-brand/25 blur-[90px]"
                  aria-hidden="true"
                />
                <div className="relative">
                  <h2 className="text-3xl font-semibold tracking-tight text-fg">
                    Ready when you are
                  </h2>
                  <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-subtle">
                    Enigma-Cube invites clients directly. Sign in with the
                    address your invitation was sent to.
                  </p>
                  <Link
                    href={isSignedIn ? "/dashboard" : "/sign-in"}
                    className="glow-brand mt-8 inline-flex h-11 items-center gap-2 rounded-[10px] bg-brand px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
                  >
                    {isSignedIn ? "Open your portal" : "Sign in"}
                    <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-hairline px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <BrandMark />
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
            © {new Date().getFullYear()} Enigma-Cube
          </p>
        </div>
      </footer>
    </div>
  );
}
