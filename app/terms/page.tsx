export const metadata = {
  title: 'Terms of Service — Kith',
  description: 'The terms governing your use of Kith.',
};

export default function TermsPage() {
  return (
    <div className="w-full px-4 md:px-6 py-6 md:py-12 max-w-2xl mx-auto">
      <a href="/" className="inline-flex items-center min-h-[44px] text-sm text-stone-500 hover:text-stone-700 transition-colors mb-4 md:mb-8">
        ← Back to Home
      </a>
      <h1 className="text-3xl md:text-4xl font-bold text-stone-800 mb-2">Terms of Service</h1>
      <p className="text-sm text-stone-500 mb-8 md:mb-10">The basics of using Kith.</p>

      <div className="space-y-8 text-stone-700 leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-stone-800">What Kith is</h2>
          <p>
            Kith is a peer support community. People here are not therapists,
            doctors, or crisis counselors. Kith is not a substitute for
            professional help. If you&apos;re in crisis, please contact a
            qualified professional or local emergency services.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-stone-800">Eligibility</h2>
          <p>
            You must be at least 18 years old to use Kith. By creating an
            account, you confirm that you meet this requirement. If you are
            under 18, you may not use this platform.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-stone-800">How to treat each other</h2>
          <p>
            Kith only works because people show up with care. So:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>No harassment, threats, or personal attacks.</li>
            <li>No content that encourages self-harm or harm to others.</li>
            <li>No hateful, sexual, or otherwise harmful material.</li>
            <li>No spam, scams, or impersonation.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-stone-800">Our role</h2>
          <p>
            We can remove content that violates these guidelines, and we can
            suspend or close accounts when needed to keep the community safe.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-stone-800">Contact</h2>
          <p>
            Questions, concerns, or something we should know about? Email us at{' '}
            <a href="mailto:hello@kith.support" className="text-stone-800 underline hover:text-stone-600">
              hello@kith.support
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
