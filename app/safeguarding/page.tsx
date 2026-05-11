import type { Metadata } from 'next';

export function generateMetadata(): Metadata {
  return {
    title: 'Safeguarding — Kith',
    description: 'How Kith protects the safety and wellbeing of everyone on the platform.',
  };
}

export default function SafeguardingPage() {
  return (
    <div className="w-full px-4 md:px-6 py-6 md:py-12 max-w-2xl mx-auto">
      <a href="/" className="inline-flex items-center min-h-[44px] text-sm text-stone-500 hover:text-stone-700 transition-colors mb-4 md:mb-8">
        ← Back to Home
      </a>
      <h1 className="text-3xl md:text-4xl font-bold text-stone-800 mb-2">Safeguarding Policy</h1>
      <p className="text-sm text-stone-500 mb-8 md:mb-10">
        Kith is a peer support community for adults navigating non-clinical emotional difficulty. We take the safety and wellbeing of everyone on the platform seriously.
      </p>

      <div className="space-y-8 text-stone-700 leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-stone-800">Who this applies to</h2>
          <p>
            This policy applies to all users of Kith — both those seeking support and those offering it.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-stone-800">Crisis situations</h2>
          <p>
            Kith is not a crisis service. If someone appears to be in immediate danger — of harm to themselves or others — Kith&apos;s crisis detection system will surface relevant helpline resources automatically. Users are always encouraged to contact emergency services or a qualified mental health professional in urgent situations.
          </p>
          <p>
            Helpers on Kith are not trained counsellors and are not expected to manage crisis situations. If a helper encounters content that concerns them, they should report it using the in-platform reporting tools and, if they believe someone is in immediate danger, contact emergency services.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-stone-800">Moderation</h2>
          <p>
            Reported content is reviewed by Kith&apos;s admin team. Content that violates community guidelines may be removed. Users who repeatedly violate guidelines may be suspended or banned.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-stone-800">Helper wellbeing</h2>
          <p>
            Showing up for others can be emotionally demanding. Helpers are reminded that their own wellbeing matters. It is always acceptable to step back from a conversation that is affecting you.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-stone-800">Contact</h2>
          <p>
            If you have a safeguarding concern that cannot be addressed through the platform&apos;s reporting tools, contact us at{' '}
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
