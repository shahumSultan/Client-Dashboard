import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/shared/BrandMark";

export default function SignInPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-md animate-fade-up">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-xs font-medium text-subtle transition-colors hover:text-fg"
        >
          <ArrowLeft size={13} aria-hidden="true" />
          Back to home
        </Link>

        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark />
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-fg">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-subtle">
            Sign in to pick up where your project left off.
          </p>
        </div>

        <SignIn />
      </div>
    </main>
  );
}
