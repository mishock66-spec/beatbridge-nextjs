import { SignIn } from "@clerk/nextjs";

export default function SignInPage({
  searchParams,
}: {
  searchParams: { msg?: string };
}) {
  const showTrialMsg = searchParams?.msg === "trial";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 gap-5">
      {showTrialMsg && (
        <div className="max-w-[400px] w-full bg-orange-500/10 border border-orange-500/20 rounded-xl px-5 py-4 text-center">
          <p className="text-sm text-orange-400 leading-relaxed">
            Sign in to explore this network free for 14 days — no credit card required.
          </p>
        </div>
      )}
      <SignIn fallbackRedirectUrl="/onboarding" />
    </div>
  );
}
