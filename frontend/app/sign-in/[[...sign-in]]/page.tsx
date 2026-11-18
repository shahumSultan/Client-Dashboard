import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth/AuthShell";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // The landing page's email field posts here; pre-fill Clerk with it so the
  // visitor carries straight on instead of typing it twice.
  const { email } = await searchParams;
  const emailAddress = typeof email === "string" && email.length <= 254 ? email : undefined;

  return (
    <AuthShell
      title={
        <>
          Welcome <em className="italic">back</em>.
        </>
      }
      subtitle="Sign in to pick up where your project left off."
      footnote={"The portal is invite-only. No invitation yet? Ask your Enigma\u2011Cube contact."}
    >
      <SignIn
        initialValues={emailAddress ? { emailAddress } : undefined}
        // Accounts start from an invitation, never from this page.
        appearance={{ elements: { footerAction: "!hidden" } }}
      />
    </AuthShell>
  );
}
