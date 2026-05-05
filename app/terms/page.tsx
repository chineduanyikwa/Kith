export const metadata = {
  title: 'Terms — Kith',
};

export default function TermsPage() {
  return (
    <div className="px-6 py-12 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-stone-800 mb-2">Terms of Service</h1>
      <p className="text-sm text-stone-500 mb-10">The basics of using Kith.</p>

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
          <h2 className="text-lg font-semibold text-stone-800">Who can use Kith</h2>
          <p>
            You must be 18 or older to use Kith. By signing up, you&apos;re
            confirming that you are.
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
