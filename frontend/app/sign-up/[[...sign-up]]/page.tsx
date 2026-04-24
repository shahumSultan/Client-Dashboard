import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-white tracking-tight">Enigma-Cube</h1>
        <p className="text-slate-400 mt-2">Client Portal</p>
      </div>
      <SignUp />
    </div>
  );
}
