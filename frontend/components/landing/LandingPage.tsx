"use client";

import { useRef } from "react";
import Link from "next/link";
import {
  motion,
  useScroll,
  useTransform,
  useInView,
} from "framer-motion";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  BarChart3,
  MessageSquare,
  TrendingUp,
  Shield,
  Zap,
  RefreshCw,
  Circle,
} from "lucide-react";

/* ─── Reusable fade-up animation wrapper ──────────────────────────── */
function FadeUp({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Floating dashboard preview card ──────────────────────────────── */
function DashboardPreview() {
  const milestones = [
    { label: "Discovery & Analysis", done: true },
    { label: "AI Model Development", done: true },
    { label: "System Integration", active: true },
    { label: "Testing & QA", done: false },
    { label: "Delivery & Handoff", done: false },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.9, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full max-w-sm mx-auto"
    >
      {/* Glow */}
      <div className="absolute inset-0 bg-[#FFB3B3]/30 blur-3xl rounded-3xl -z-10 scale-110" />

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl shadow-[#FFB3B3]/40 overflow-hidden">
        {/* Card header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Active Project</p>
            <p className="text-sm font-semibold text-slate-900 mt-0.5">Sales Automation System</p>
          </div>
          <span className="text-[11px] font-semibold bg-[#FFB3B3]/20 text-[#A92E2E] px-2.5 py-1 rounded-full">
            In Progress
          </span>
        </div>

        {/* Progress */}
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-slate-500 font-medium">Overall Progress</span>
            <span className="font-bold text-slate-900">62%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[#A92E2E] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: "62%" }}
              transition={{ duration: 1.2, delay: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Milestones */}
        <div className="px-5 py-4 space-y-2.5">
          {milestones.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.7 + i * 0.08 }}
              className="flex items-center gap-2.5"
            >
              {m.done ? (
                <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
              ) : m.active ? (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.8 }}
                >
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-[#A92E2E] flex items-center justify-center shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#A92E2E]" />
                  </div>
                </motion.div>
              ) : (
                <Circle size={14} className="text-slate-300 shrink-0" />
              )}
              <span className={`text-xs ${m.done ? "text-slate-400 line-through" : m.active ? "text-slate-900 font-medium" : "text-slate-400"}`}>
                {m.label}
              </span>
              {m.active && (
                <span className="ml-auto text-[10px] font-semibold text-[#A92E2E] bg-[#FFB3B3]/20 px-1.5 py-0.5 rounded-full">
                  Active
                </span>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Floating stat badge */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 1.1 }}
        className="absolute -right-4 top-8 bg-white rounded-xl shadow-lg border border-slate-200 px-3 py-2"
      >
        <p className="text-xs text-slate-400">This month</p>
        <p className="text-lg font-bold text-slate-900">+340</p>
        <p className="text-[11px] text-emerald-600 font-medium">Leads processed</p>
      </motion.div>

      {/* Floating notification */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 1.3 }}
        className="absolute -left-4 bottom-8 bg-white rounded-xl shadow-lg border border-slate-200 px-3 py-2 max-w-[160px]"
      >
        <div className="flex items-center gap-1.5 mb-0.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <p className="text-[10px] font-semibold text-slate-700">Milestone complete</p>
        </div>
        <p className="text-[11px] text-slate-400">AI Model Development delivered</p>
      </motion.div>
    </motion.div>
  );
}

/* ─── Main component ────────────────────────────────────────────────── */
interface LandingPageProps {
  isSignedIn: boolean;
}

export function LandingPage({ isSignedIn }: LandingPageProps) {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.6], [0, -60]);

  const features = [
    {
      icon: TrendingUp,
      title: "Real-time Progress",
      desc: "Live status updates, completion tracking, and milestone timelines. No more chasing updates.",
      color: "bg-[#FFB3B3]/25 text-[#A92E2E]",
    },
    {
      icon: MessageSquare,
      title: "Direct Communication",
      desc: "Submit requests, track responses, get admin replies — all in one thread, fully logged.",
      color: "bg-[#FFB3B3]/15 text-[#A92E2E]",
    },
    {
      icon: BarChart3,
      title: "Business Impact",
      desc: "Leads, conversions, and ROI from your AI system — not vanity metrics, real business data.",
      color: "bg-emerald-50 text-emerald-600",
    },
  ];

  const benefits = [
    { icon: Zap, title: "Increased Productivity", desc: "Automate repetitive workflows and reclaim hours every week." },
    { icon: MessageSquare, title: "Better Client Experience", desc: "Clients feel informed and in control — no surprise updates." },
    { icon: Clock, title: "24/7 Visibility", desc: "Your portal is always live. Check progress at any hour." },
    { icon: TrendingUp, title: "Data-Driven Decisions", desc: "Every metric tracked and surfaced in plain language." },
    { icon: Shield, title: "Secure & Private", desc: "Role-based access. Each client sees only their data." },
    { icon: RefreshCw, title: "Scalability", desc: "One portal, unlimited clients and projects as you grow." },
  ];

  const steps = [
    {
      num: "01",
      title: "Smart Onboarding",
      desc: "You're guided through a simple setup — business info, integrations, goals. We handle the rest.",
    },
    {
      num: "02",
      title: "AI Development",
      desc: "Our team builds your automation system. Every step is tracked live in your portal.",
    },
    {
      num: "03",
      title: "Seamless Delivery",
      desc: "Milestones get checked off in real time. Deliverables land directly in your files hub.",
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden">

      {/* ── Nav ──────────────────────────────────────────────── */}
      <motion.nav
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 lg:px-10 py-4 bg-white/80 backdrop-blur-lg border-b border-slate-200/60"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#A92E2E] flex items-center justify-center shadow-sm shadow-[#FFB3B3]">
            <Zap size={15} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-slate-900 tracking-tight">Enigma-Cube</span>
        </div>

        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-500">
          <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
          <a href="#process" className="hover:text-slate-900 transition-colors">How it works</a>
          <a href="#benefits" className="hover:text-slate-900 transition-colors">Benefits</a>
        </div>

        <div className="flex items-center gap-3">
          {isSignedIn ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-sm font-semibold bg-[#A92E2E] hover:bg-[#8B2424] text-white px-4 py-2 rounded-lg transition-colors"
            >
              Dashboard <ArrowRight size={14} />
            </Link>
          ) : (
            <>
              <SignInButton>
                <button className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors hidden sm:block">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton>
                <button className="text-sm font-semibold bg-[#A92E2E] hover:bg-[#8B2424] text-white px-4 py-2 rounded-lg transition-colors">
                  Get Access
                </button>
              </SignUpButton>
            </>
          )}
        </div>
      </motion.nav>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex items-center pt-20 pb-16 px-6 lg:px-10 overflow-hidden bg-[#fafafa]"
      >
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `linear-gradient(#A92E2E 1px, transparent 1px), linear-gradient(90deg, #A92E2E 1px, transparent 1px)`,
            backgroundSize: "64px 64px",
          }}
        />
        {/* Gradient blobs */}
        <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-[#FFB3B3]/30 rounded-full blur-[120px] -z-0" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-[#FFB3B3]/20 rounded-full blur-[100px] -z-0" />

        <motion.div
          style={{ opacity: heroOpacity, y: heroY }}
          className="relative z-10 max-w-6xl mx-auto w-full grid lg:grid-cols-2 gap-12 lg:gap-16 items-center"
        >
          {/* Left */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#A92E2E] bg-[#FFB3B3]/20 border border-[#FFB3B3]/50 px-3 py-1.5 rounded-full mb-6"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#A92E2E] animate-pulse" />
              Enigma-Cube Client Portal
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-[1.06] text-slate-900 mb-6"
            >
              Intelligent AI.{" "}
              <span className="bg-gradient-to-r from-[#A92E2E] to-[#c0392b] bg-clip-text text-transparent">
                Full Transparency.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="text-lg text-slate-500 leading-relaxed mb-8 max-w-md"
            >
              Track every milestone, review deliverables, and see the real business impact of your AI system — all in one place.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-3"
            >
              {isSignedIn ? (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center gap-2 bg-[#A92E2E] hover:bg-[#8B2424] text-white font-semibold text-sm px-6 py-3.5 rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#FFB3B3]"
                >
                  Open Dashboard <ArrowRight size={16} />
                </Link>
              ) : (
                <>
                  <SignUpButton>
                    <button className="inline-flex items-center justify-center gap-2 bg-[#A92E2E] hover:bg-[#8B2424] text-white font-semibold text-sm px-6 py-3.5 rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#FFB3B3]">
                      Request Access <ArrowRight size={16} />
                    </button>
                  </SignUpButton>
                  <SignInButton>
                    <button className="inline-flex items-center justify-center gap-2 border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 font-semibold text-sm px-6 py-3.5 rounded-xl transition-all duration-200 hover:bg-white hover:shadow-sm">
                      Sign In
                    </button>
                  </SignInButton>
                </>
              )}
            </motion.div>

            {/* Social proof */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="flex items-center gap-3 mt-8 pt-8 border-t border-slate-200/80"
            >
              <div className="flex -space-x-2">
                {["#A92E2E", "#c0392b", "#e74c3c"].map((c, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: c }}
                  >
                    {["LF", "SC", "MR"][i]}
                  </div>
                ))}
              </div>
              <p className="text-sm text-slate-500">
                Trusted by <span className="font-semibold text-slate-800">law firms and agencies</span> across the US
              </p>
            </motion.div>
          </div>

          {/* Right — dashboard preview */}
          <DashboardPreview />
        </motion.div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6 lg:px-10 bg-white">
        <div className="max-w-5xl mx-auto">
          <FadeUp className="text-center mb-14">
            <p className="text-xs font-bold tracking-widest text-[#A92E2E] uppercase mb-3">What's inside</p>
            <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">
              AI Solutions That Work For You
            </h2>
            <p className="text-slate-500 mt-3 max-w-lg mx-auto">
              We design, develop and implement automation tools that help you work smarter — and now you can watch every step unfold in real time.
            </p>
          </FadeUp>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, desc, color }, i) => (
              <FadeUp key={title} delay={i * 0.1}>
                <div className="group p-6 rounded-2xl border border-slate-200 hover:border-[#FFB3B3]/60 hover:shadow-xl hover:shadow-[#FFB3B3]/30 transition-all duration-300 hover:-translate-y-1.5 bg-white h-full">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${color}`}>
                    <Icon size={20} />
                  </div>
                  <h3 className="font-bold text-slate-900 text-base mb-2">{title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── Product showcase ─────────────────────────────────── */}
      <section className="py-24 px-6 lg:px-10 bg-slate-50 border-y border-slate-100">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <FadeUp>
              <p className="text-xs font-bold tracking-widest text-[#A92E2E] uppercase mb-3">The portal</p>
              <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
                Your project. Your data. Always visible.
              </h2>
              <p className="text-slate-500 leading-relaxed mb-6">
                No more waiting on email updates. Your Enigma-Cube portal shows you live progress, every milestone, every deliverable, and the direct ROI from your AI system.
              </p>
              <ul className="space-y-3">
                {[
                  "Live project status and completion percentage",
                  "Milestone timeline with deliverable attachments",
                  "Submit requests — bugs, features, changes",
                  "Analytics: leads, conversions, revenue attributed",
                  "AI assistant to explain anything in plain English",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600">
                    <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </FadeUp>

            {/* Mini UI mockup */}
            <FadeUp delay={0.15}>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-100 overflow-hidden">
                {/* Fake browser bar */}
                <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 bg-white rounded-md border border-slate-200 px-3 py-1 text-xs text-slate-400 text-center">
                    portal.enigma-cube.com
                  </div>
                </div>
                {/* Fake sidebar + content */}
                <div className="flex h-56">
                  <div className="w-14 bg-slate-900 flex flex-col items-center py-4 gap-4">
                    {[BarChart3, MessageSquare, CheckCircle2, Shield].map((Icon, i) => (
                      <div key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center ${i === 0 ? "bg-[#A92E2E]" : "hover:bg-slate-700"}`}>
                        <Icon size={14} className="text-slate-300" />
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 p-4 overflow-hidden">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="h-3 w-24 bg-slate-900 rounded-full mb-1" />
                        <div className="h-2 w-16 bg-slate-200 rounded-full" />
                      </div>
                      <div className="h-6 w-16 bg-[#FFB3B3]/30 rounded-full" />
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full mb-1.5 overflow-hidden">
                      <div className="h-full w-[62%] bg-[#A92E2E] rounded-full" />
                    </div>
                    <div className="text-[10px] text-right text-slate-400 mb-3">62%</div>
                    {["AI Development", "Integration", "Testing"].map((label, i) => (
                      <div key={label} className="flex items-center gap-2 mb-2">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${i === 0 ? "bg-emerald-500" : i === 1 ? "bg-[#A92E2E]" : "bg-slate-200"}`} />
                        <div className={`h-2 rounded-full ${i === 0 ? "bg-slate-200 w-28" : i === 1 ? "bg-[#FFB3B3]/40 w-20" : "bg-slate-100 w-16"}`} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── Process ──────────────────────────────────────────── */}
      <section id="process" className="py-24 px-6 lg:px-10 bg-white">
        <div className="max-w-5xl mx-auto">
          <FadeUp className="text-center mb-14">
            <p className="text-xs font-bold tracking-widest text-[#A92E2E] uppercase mb-3">How it works</p>
            <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">
              Our Simple, Smart, and Scalable Process
            </h2>
          </FadeUp>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-8 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-gradient-to-r from-[#FFB3B3] via-[#A92E2E] to-[#FFB3B3]" />

            {steps.map(({ num, title, desc }, i) => (
              <FadeUp key={num} delay={i * 0.12}>
                <div className="relative text-center">
                  <div className="w-16 h-16 rounded-2xl bg-[#A92E2E] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#FFB3B3]/50">
                    <span className="text-white font-bold text-lg">{num}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2">{title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── Benefits ─────────────────────────────────────────── */}
      <section id="benefits" className="py-24 px-6 lg:px-10 bg-slate-950">
        <div className="max-w-5xl mx-auto">
          <FadeUp className="text-center mb-14">
            <p className="text-xs font-bold tracking-widest text-[#FFB3B3] uppercase mb-3">Why it matters</p>
            <h2 className="text-4xl font-extrabold text-white tracking-tight">
              The Key Benefits for Your Business
            </h2>
          </FadeUp>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {benefits.map(({ icon: Icon, title, desc }, i) => (
              <FadeUp key={title} delay={i * 0.07}>
                <div className="group p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-[#A92E2E]/50 transition-all duration-300 hover:-translate-y-1">
                  <div className="w-9 h-9 rounded-xl bg-[#A92E2E]/20 flex items-center justify-center mb-3">
                    <Icon size={16} className="text-[#FFB3B3]" />
                  </div>
                  <h3 className="font-semibold text-white text-sm mb-1.5">{title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="py-24 px-6 lg:px-10 bg-white">
        <FadeUp>
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
              Let AI do the work
              <br />
              <span className="bg-gradient-to-r from-[#A92E2E] to-[#c0392b] bg-clip-text text-transparent">
                so you can scale faster.
              </span>
            </h2>
            <p className="text-slate-500 text-lg mb-8">
              Book a call today and start automating — your portal will be ready before we even hang up.
            </p>
            {isSignedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 bg-[#A92E2E] hover:bg-[#8B2424] text-white font-semibold px-8 py-4 rounded-xl text-base transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#FFB3B3]/50"
              >
                Open Your Portal <ArrowRight size={18} />
              </Link>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <SignUpButton>
                  <button className="inline-flex items-center justify-center gap-2 bg-[#A92E2E] hover:bg-[#8B2424] text-white font-semibold px-8 py-4 rounded-xl text-base transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#FFB3B3]/50">
                    Request Portal Access <ArrowRight size={18} />
                  </button>
                </SignUpButton>
                <SignInButton>
                  <button className="inline-flex items-center justify-center gap-2 border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold px-8 py-4 rounded-xl text-base transition-all duration-200 hover:shadow-sm">
                    Sign In
                  </button>
                </SignInButton>
              </div>
            )}
          </div>
        </FadeUp>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-slate-100 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-10 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-[#A92E2E] flex items-center justify-center">
              <Zap size={12} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-700">Enigma-Cube</span>
            <span className="text-sm text-slate-400">· Intelligent Automation for Modern Businesses</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-400">
            <span>© 2025 Enigma-Cube</span>
            <Link href="/sign-in" className="hover:text-slate-600 transition-colors">
              Team Login
            </Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
