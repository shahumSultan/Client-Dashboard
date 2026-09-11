import type { Metadata, Viewport } from "next";
import { Figtree, Fragment_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { QueryProvider } from "@/components/shared/QueryProvider";
import { Toaster } from "@/components/ui/sonner";
import { clerkAppearance } from "@/lib/clerk-appearance";
import "./globals.css";

// Brand typefaces, matched to enigma-cube.com.
const figtree = Figtree({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-figtree",
});

const fragmentMono = Fragment_Mono({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-fragment-mono",
});

export const metadata: Metadata = {
  title: "Enigma-Cube | Client Portal",
  description: "Track your project progress in real time.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0d0d0d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${figtree.variable} ${fragmentMono.variable}`}
    >
      <body className="min-h-full bg-base font-sans text-fg grain">
        {/* Ambient colour behind every surface - this is what the glass blurs. */}
        <div className="ambient" aria-hidden="true" />
        <ClerkProvider
          appearance={clerkAppearance}
          // Keep auth on our own branded pages rather than Clerk's hosted
          // Account Portal - set as props because the NEXT_PUBLIC_* equivalents
          // are inlined at build time and the dev image never bakes them.
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          signInFallbackRedirectUrl="/dashboard"
          signUpFallbackRedirectUrl="/welcome"
          // Signing out lands on our own marketing/landing page rather than
          // Clerk's hosted Account Portal.
          afterSignOutUrl="/"
        >
          <QueryProvider>
            <div className="relative z-10">{children}</div>
            <Toaster richColors position="top-right" theme="dark" />
          </QueryProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
