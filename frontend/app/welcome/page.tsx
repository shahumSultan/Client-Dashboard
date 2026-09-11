"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { MailQuestion, RefreshCw } from "lucide-react";
import { useCurrentUser } from "@/hooks/useAuth";
import { BrandMark } from "@/components/shared/BrandMark";
import { PageLoader } from "@/components/shared/PageLoader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Where a signed-in user with no workspace lands.
 *
 * Access is invite-only, so there is nothing to fill in here: an invitation is
 * redeemed automatically on the first authenticated request. This page exists
 * to explain the wait rather than to collect anything.
 */
export default function WelcomePage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: user, isLoading, isFetching } = useCurrentUser();

  useEffect(() => {
    if (isLoading || !user) return;
    if (user.organization_id) router.replace("/dashboard");
    // Admins never belong to a client workspace.
    else if (user.role === "admin" || user.role === "staff") router.replace("/admin");
  }, [user, isLoading, router]);

  if (isLoading || !user) return <PageLoader />;
  if (user.organization_id || user.role === "admin" || user.role === "staff") {
    return <PageLoader label="Opening your portal" />;
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-md animate-fade-up">
        <div className="mb-8 flex justify-center">
          <BrandMark />
        </div>

        <Card>
          <CardContent className="pt-6 text-center">
            <span className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-brand-wash text-brand-soft">
              <MailQuestion size={20} aria-hidden="true" />
            </span>

            <h1 className="text-xl font-semibold tracking-tight text-fg">
              No workspace yet
            </h1>
            <p className="mt-2.5 text-sm leading-relaxed text-subtle">
              Your account isn&apos;t linked to a project workspace. Enigma-Cube
              invites clients directly - once yours is sent to{" "}
              <span className="text-fg">{user.email}</span>, this page opens your
              portal automatically.
            </p>

            <Button
              variant="outline"
              className="mt-7 w-full"
              loading={isFetching}
              onClick={() => qc.invalidateQueries({ queryKey: ["currentUser"] })}
            >
              {!isFetching && <RefreshCw size={14} aria-hidden="true" />}
              Check again
            </Button>

            <p className="mt-5 text-xs leading-relaxed text-faint">
              Invited under a different address? Sign out and sign back in with
              the one the invitation was sent to.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
