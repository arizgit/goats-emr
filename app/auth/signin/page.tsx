"use client";

import { signIn } from "next-auth/react";

export default function SignInPage() {
  return (
    <div className="mx-auto mt-20 max-w-md rounded-2xl bg-white p-6 text-center shadow-sm">
      <h2 className="text-xl font-bold text-farm-700">GoatsEMR Sign In</h2>
      <p className="mt-2 text-sm text-slate-600">Use your authorized Google account to continue.</p>
      <button onClick={() => signIn("google", { callbackUrl: "/" })} className="mt-5 w-full rounded-xl bg-farm-600 px-4 py-3 font-semibold text-white">Sign in with Google</button>
    </div>
  );
}
