export const metadata = {
  title: 'Community Guidelines — Kith',
};

export default function GuidelinesPage() {
  return (
    <div className="px-6 py-12 max-w-2xl mx-auto">
      <a href="/" className="text-sm text-stone-500 hover:text-stone-700 transition-colors inline-block mb-8">
        ← Back to Home
      </a>
      <h1 className="text-3xl font-bold text-stone-800 mb-2">Community Guidelines</h1>
      <p className="text-sm text-stone-500 mb-10">
        Kith is a space for real people carrying real weight. These guidelines exist to keep it that way.
      </p>

      <div className="space-y-8 text-stone-700 leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-stone-800">For everyone</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Be honest. You don&apos;t need to perform strength or positivity here. Say what&apos;s true for you.</li>
            <li>Be kind. The person on the other side of this is going through something. Treat them accordingly.</li>
            <li>Keep it private. What people share here is shared in trust. Don&apos;t take it elsewhere.</li>
            <li>Don&apos;t offer advice unless it&apos;s asked for. Sometimes people need to be heard, not fixed.</li>
            <li>Kith is not a substitute for professional help. If you or someone else is in crisis, please reach out to a professional or a crisis line.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-stone-800">For helpers</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Show up with your full attention. A half-hearted response can do more harm than silence.</li>
            <li>You are not responsible for fixing anyone. Your job is to make someone feel less alone — nothing more.</li>
            <li>Don&apos;t share your own story in a way that makes the conversation about you. This is their space.</li>
            <li>If a post affects you deeply, it&apos;s okay to step back. Your wellbeing matters too.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-stone-800">What&apos;s not allowed</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Harassment, judgment, or shaming of any kind</li>
            <li>Unsolicited advice or diagnosis</li>
            <li>Sharing someone&apos;s post or personal details outside of Kith</li>
            <li>Promoting products, services, or outside platforms</li>
            <li>Any content that sexualises, threatens, or demeans</li>
          </ul>
        </section>

        <section className="space-y-3">
          <p>Violations may result in removal from the platform.</p>
        </section>
      </div>
    </div>
  );
}
