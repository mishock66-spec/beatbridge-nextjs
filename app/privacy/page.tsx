export const revalidate = 0;

import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen px-4 py-12 max-w-2xl mx-auto">
      <Link href="/" className="text-orange-500 hover:text-orange-400 text-sm mb-8 inline-block">
        ← Back
      </Link>

      <h1 className="text-3xl font-black mb-2">Privacy Policy</h1>
      <p className="text-gray-500 text-sm mb-10">Last updated: March 2026</p>

      <div className="space-y-8 text-gray-300 text-sm leading-relaxed">
        <section>
          <h2 className="text-white font-bold text-lg mb-2">What data we collect</h2>
          <p>
            When you sign in with Google, we receive your email address and name via Clerk. We do not collect
            payment information or any other personal data beyond what is required to provide the service.
          </p>
        </section>

        <section>
          <h2 className="text-white font-bold text-lg mb-2">How we use it</h2>
          <p>
            Your data is used solely to operate the BeatBridge service — displaying your account, managing
            your session, and sending newsletters if you have subscribed. We do not sell or share your data
            with third parties for advertising purposes.
          </p>
        </section>

        <section>
          <h2 className="text-white font-bold text-lg mb-2">Third-party services</h2>
          <ul className="list-disc list-inside space-y-1">
            <li><span className="text-white font-medium">Clerk</span> — handles authentication and session management</li>
            <li><span className="text-white font-medium">Resend</span> — sends transactional and newsletter emails</li>
            <li><span className="text-white font-medium">Airtable</span> — stores artist and connection data</li>
          </ul>
          <p className="mt-3">Each service has its own privacy policy governing how they handle data.</p>
        </section>

        <section>
          <h2 className="text-white font-bold text-lg mb-2">Contact</h2>
          <p>
            Questions about this policy?{" "}
            <a href="mailto:contact@beatbridge.live" className="text-orange-500 hover:text-orange-400">
              contact@beatbridge.live
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
