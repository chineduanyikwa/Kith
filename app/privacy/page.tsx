export const metadata = {
  title: 'Privacy Policy — Kith',
  description: 'How Kith handles your data and protects your privacy.',
};

export default function PrivacyPage() {
  return (
    <div className="w-full px-4 md:px-6 py-6 md:py-12 max-w-2xl mx-auto">
      <a href="/" className="inline-flex items-center min-h-[44px] text-sm text-stone-500 hover:text-stone-700 transition-colors mb-4 md:mb-8">
        ← Back to Home
      </a>
      <h1 className="text-3xl md:text-4xl font-bold text-stone-800 mb-2">Privacy</h1>
      <p className="text-sm text-stone-500 mb-8 md:mb-10">How we handle your information.</p>

      <div className="space-y-8 text-stone-700 leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-stone-800">What we collect</h2>
          <p>
            When you use Kith, we collect your email address, the username you choose,
            the posts you write, and the responses you send or receive. That&apos;s it.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-stone-800">How we use it</h2>
          <p>
            We use this information to operate the platform — letting you sign in,
            showing your posts to people who can help, delivering responses,
            and keeping the community safe.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-stone-800">We don&apos;t sell your data</h2>
          <p>
            We don&apos;t sell your data. We don&apos;t share it with advertisers.
            Kith is a peer support community, not a product built on your information.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-stone-800">Deleting your account</h2>
          <p>
            You can delete your account at any time, and we&apos;ll remove your
            account, your posts, and your responses. If you need help with this,
            email us.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-stone-800">Contact</h2>
          <p>
            Questions about privacy? Reach out at{' '}
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
