import Link from "next/link";
import { BrandMark } from "@/components/shared/BrandMark";
import { ParticleMark } from "@/components/brand/ParticleMark";
import { ParticleWave } from "@/components/brand/ParticleWave";

/**
 * The threshold into the portal. It's the one place the website's particle
 * signature carries over: the cube assembling on the left, the wave rolling
 * underneath, and the form held in a single centred column on the right.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footnote,
}: {
  title: React.ReactNode;
  subtitle: string;
  children: React.ReactNode;
  footnote?: string;
}) {
  return (
    <main className="relative grid min-h-dvh overflow-hidden lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      {/* Brand side: desktop only. On phones the wave alone sits under the form. */}
      <section
        aria-hidden="true"
        className="relative hidden flex-col justify-between border-r border-hairline px-12 pb-10 lg:flex"
      >
        <div className="flex h-[72px] items-center">
          <BrandMark />
        </div>
        <div className="relative mx-auto aspect-[389/416] w-full max-w-[420px]">
          <ParticleMark />
        </div>
        <div>
          <p className="max-w-md text-balance font-display text-[2.25rem] font-normal leading-[1.08] tracking-tight text-fg-strong">
            Know exactly where your project <em className="italic">stands.</em>
          </p>
          <p className="label-system mt-4">business systems · automation · ai · software</p>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%] opacity-90">
          <ParticleWave />
        </div>
      </section>

      <section className="relative flex flex-col px-4 pb-8 sm:px-8">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[30%] opacity-50 lg:hidden">
          <ParticleWave rows={32} cols={90} />
        </div>

        <div className="relative flex h-[72px] items-center justify-between">
          <span className="lg:hidden">
            <BrandMark />
          </span>
          <Link
            href="/"
            className="link-signal ml-auto text-sm"
          >
            Back to home
          </Link>
        </div>

        <div className="relative mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">
          <h1 className="text-balance text-4xl font-normal leading-[1.05] tracking-tight text-fg-strong">
            {title}
          </h1>
          <p className="mb-8 mt-3 text-[15px] leading-relaxed text-muted">{subtitle}</p>
          {children}
          {footnote && <p className="mt-8 text-sm text-subtle">{footnote}</p>}
        </div>
      </section>
    </main>
  );
}
