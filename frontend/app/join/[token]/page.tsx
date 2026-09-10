"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, MailWarning, CircleAlert } from "lucide-react";
import api from "@/lib/api";
import { useCurrentUser } from "@/hooks/useAuth";
import { BrandMark } from "@/components/shared/BrandMark";
import { PageLoader } from "@/components/shared/PageLoader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { InvitationPreview } from "@/lib/types";

export default function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const { data: user, isLoading } = useCurrentUser();
  const [accepting, setAccepting] = useState(false);

  const { data: preview, isLoading: previewLoading, isError } =
    useQuery<InvitationPreview>({
      queryKey: ["invitation-preview", token],
      queryFn: async () => {
        const { data } = await api.get("/invitations/preview", { params: { token } });
        return data;
      },
      retry: false,
      enabled: !!user,
    });

  // Signing in with the invited address already places the user, so most
  // people arrive here already in. Send them straight through.
  useEffect(() => {
    if (user?.organization_id) router.replace("/dashboard");
  }, [user, router]);

  if (isLoading || !user) return <PageLoader />;
  if (user.organization_id) return <PageLoader label="Opening your portal" />;
  if (previewLoading) return <PageLoader label="Checking your invitation" />;

  const mismatch =
    preview && preview.email.toLowerCase() !== (user.email ?? "").toLowerCase();

  async function accept() {
    setAccepting(true);
    try {
      await api.post("/invitations/accept", { token });
      await qc.invalidateQueries({ queryKey: ["currentUser"] });
      toast.success("You're in", { description: `Welcome to ${preview?.organization_name}.` });
      router.replace("/dashboard");
    } catch {
      toast.error("Couldn't accept this invitation");
      setAccepting(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-md animate-fade-up">
        <div className="mb-8 flex justify-center">
          <BrandMark />
        </div>

        <Card>
          <CardContent className="pt-6 text-center">
            {isError || !preview ? (
              <Expired />
            ) : mismatch ? (
              <Mismatch invited={preview.email} signedInAs={user.email} />
            ) : (
              <>
                <h1 className="text-xl font-semibold tracking-tight text-fg">
                  Join {preview.organization_name}
                </h1>
                <p className="mt-2.5 text-sm leading-relaxed text-subtle">
                  You&apos;ve been invited to the Enigma-Cube client portal for{" "}
                  <span className="text-fg">{preview.organization_name}</span>.
                </p>
                <Button
                  size="lg"
                  className="mt-7 w-full"
                  loading={accepting}
                  onClick={accept}
                >
                  {!accepting && (
                    <>
                      Accept invitation
                      <ArrowRight size={15} aria-hidden="true" />
                    </>
                  )}
                </Button>
                <p className="mt-4 text-xs text-faint">
                  Signed in as <span className="text-subtle">{user.email}</span>
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function Expired() {
  return (
    <>
      <span className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-warning-wash text-warning">
        <CircleAlert size={20} aria-hidden="true" />
      </span>
      <h1 className="text-xl font-semibold tracking-tight text-fg">
        This invitation is no longer valid
      </h1>
      <p className="mt-2.5 text-sm leading-relaxed text-subtle">
        It may have expired, been revoked, or already been used. Ask your
        Enigma-Cube contact to send a new one.
      </p>
    </>
  );
}

function Mismatch({
  invited,
  signedInAs,
}: {
  invited: string;
  signedInAs: string;
}) {
  return (
    <>
      <span className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-warning-wash text-warning">
        <MailWarning size={20} aria-hidden="true" />
      </span>
      <h1 className="text-xl font-semibold tracking-tight text-fg">
        Wrong account
      </h1>
      <p className="mt-2.5 text-sm leading-relaxed text-subtle">
        This invitation was sent to{" "}
        <span className="text-fg">{invited}</span>, but you&apos;re signed in as{" "}
        <span className="text-fg">{signedInAs}</span>.
      </p>
      <p className="mt-4 text-sm leading-relaxed text-subtle">
        Sign out and sign back in with the invited address.
      </p>
      <Link href="/sign-in" className="mt-7 block">
        <Button variant="outline" size="lg" className="w-full">
          Switch account
        </Button>
      </Link>
    </>
  );
}
