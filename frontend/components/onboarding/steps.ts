import {
  FileSignature,
  CreditCard,
  Sparkles,
  LayoutDashboard,
  CalendarClock,
  Rocket,
  type LucideIcon,
} from "lucide-react";
import type { Engagement } from "@/lib/types";

export type StepKey = "agreement" | "invoice" | "welcome" | "portal" | "call" | "launch";
export type StepState = "done" | "todo" | "locked";

export interface Step {
  key: StepKey;
  label: string;
  hint: string;
  icon: LucideIcon;
  state: StepState;
  /** Why it is locked, in the client's terms. */
  lockedReason?: string;
}

/**
 * The six steps in the order the client meets them.
 *
 * The portal step is done from the start - they are standing in it. Showing
 * one step already complete is deliberate: the sequence opens with momentum
 * rather than a wall of unchecked boxes.
 */
export function stepsFor(e: Engagement): Step[] {
  const signed = !!e.signed_at;
  const paid = !!(e.payment_reported_at || e.paid_at);
  const afterPayment = "Opens once your invoice is paid";

  return [
    {
      key: "agreement",
      label: "Sign the agreement",
      hint: "Scope, deliverables, timeline and revisions",
      icon: FileSignature,
      state: signed ? "done" : "todo",
    },
    {
      key: "invoice",
      label: "Pay the invoice",
      hint: "Card or bank transfer",
      icon: CreditCard,
      state: paid ? "done" : signed ? "todo" : "locked",
      lockedReason: "Opens once the agreement is signed",
    },
    {
      key: "welcome",
      label: "Your welcome pack",
      hint: "Who, how and when we talk",
      icon: Sparkles,
      state: !paid ? "locked" : e.welcome_read_at ? "done" : "todo",
      lockedReason: afterPayment,
    },
    {
      key: "portal",
      label: "Your client portal",
      hint: "You're already in",
      icon: LayoutDashboard,
      state: "done",
    },
    {
      key: "call",
      label: "Book the kickoff call",
      hint: "Goals, direction, logistics",
      icon: CalendarClock,
      state: !paid ? "locked" : e.call_scheduled_for ? "done" : "todo",
      lockedReason: afterPayment,
    },
    {
      key: "launch",
      label: "Project underway",
      hint: "Your timeline and what's next",
      icon: Rocket,
      state: !paid ? "locked" : e.stage === "complete" ? "done" : "todo",
      lockedReason: afterPayment,
    },
  ];
}

/** Where to drop the client when they open the page. */
export function initialStep(e: Engagement): StepKey {
  if (!e.signed_at) return "agreement";
  if (!(e.payment_reported_at || e.paid_at)) return "invoice";
  // Once paid, land on the overview: it shows the progress made and exactly
  // what remains, which is the answer to "did I make the right call?".
  return "launch";
}

export function progressOf(steps: Step[]): number {
  return Math.round((steps.filter((s) => s.state === "done").length / steps.length) * 100);
}
