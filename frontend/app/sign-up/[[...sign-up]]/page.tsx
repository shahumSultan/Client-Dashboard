import { SignUp } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth/AuthShell";

export default function SignUpPage() {
  return (
    <AuthShell
      title={
        <>
          Create your <em className="italic">account</em>.
        </>
      }
      subtitle="One minute to set up. We'll ask for your company next."
    >
      <SignUp />
    </AuthShell>
  );
}
