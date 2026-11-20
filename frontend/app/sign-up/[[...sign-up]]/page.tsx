import { SignUp } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth/AuthShell";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Arriving from an invitation link (see proxy.ts): there's no company to set
  // up, and the account must use the address the invitation went to.
  const redirect = (await searchParams).redirect_url;
  const invited = typeof redirect === "string" && redirect.includes("/join/");

  return (
    <AuthShell
      title={
        <>
          Create your <em className="italic">account</em>.
        </>
      }
      subtitle={
        invited
          ? "Use the email address your invitation was sent to. You'll go straight in once you're signed up."
          : "One minute to set up. We'll ask for your company next."
      }
    >
      <SignUp />
    </AuthShell>
  );
}
