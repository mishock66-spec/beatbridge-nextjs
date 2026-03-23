export const revalidate = 0;

import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen px-4 py-12 max-w-2xl mx-auto">
      <Link href="/" className="text-orange-500 hover:text-orange-400 text-sm mb-8 inline-block">
        ← Back
      </Link>

      <h1 className="text-3xl font-black mb-2">Terms of Service</h1>
      <p className="text-gray-500 text-sm mb-10">Last updated: March 2026</p>

      <div className="space-y-8 text-gray-300 text-sm leading-relaxed">
        <section>
          <h2 className="text-white font-bold text-lg mb-2">About BeatBridge</h2>
          <p>
            BeatBridge is a hip-hop networking tool built for beatmakers. It maps the Instagram connections
            of established artists and provides personalized DM templates to help producers reach the right
            people.
          </p>
        </section>

        <section>
          <h2 className="text-white font-bold text-lg mb-2">Acceptable use</h2>
          <p>
            By using BeatBridge you agree not to spam, harass, or abuse the DM templates provided. The
            templates are intended as a starting point for genuine outreach — misuse that results in
            Instagram restrictions or harassment of artists may result in your account being removed.
          </p>
        </section>

        <section>
          <h2 className="text-white font-bold text-lg mb-2">Service provided as-is</h2>
          <p>
            BeatBridge is provided "as is" without warranties of any kind. We make no guarantees regarding
            uptime, accuracy of data, or results from outreach. Use of the service is at your own risk.
          </p>
        </section>

        <section>
          <h2 className="text-white font-bold text-lg mb-2">Changes to these terms</h2>
          <p>
            We may update these terms from time to time. Continued use of BeatBridge after changes are
            posted constitutes acceptance of the updated terms.
          </p>
        </section>

        <section>
          <h2 className="text-white font-bold text-lg mb-2">Contact</h2>
          <p>
            Questions about these terms?{" "}
            <a href="mailto:contact@beatbridge.live" className="text-orange-500 hover:text-orange-400">
              contact@beatbridge.live
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
