export default function Respond() {
  return (
    <main className="min-h-screen bg-stone-50 px-6 py-10">
      <div className="max-w-md mx-auto">

        <div className="mb-6">
          <a href="#" className="text-sm text-stone-400 hover:text-stone-600">
            Back to Post
          </a>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl px-5 py-6 mb-8">
          <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-3">
            You are responding to
          </p>
          <p className="text-stone-700 text-sm leading-relaxed">
            I lost my mother three weeks ago and I don't know how to keep going.
          </p>
          <p className="text-xs text-stone-400 mt-3">A member of Kith · 2h ago</p>
        </div>

        <div className="space-y-4">

          <div>
            <label className="text-sm font-medium text-stone-600 block mb-2">
              Your response
            </label>
            <textarea
              placeholder="Speak from your experience. You don't have to fix anything. Just be present."
              rows={6}
              className="w-full bg-white border border-stone-200 rounded-2xl px-5 py-4 text-stone-700 text-sm focus:outline-none focus:border-stone-400 resize-none"
            />
          </div>

          <div className="flex items-center gap-4 pt-2">
            <button className="flex items-center gap-2 text-sm text-stone-500">
              <div className="w-5 h-5 rounded-full border-2 border-stone-300"></div>
              Respond as yourself
            </button>
            <button className="flex items-center gap-2 text-sm text-stone-500">
              <div className="w-5 h-5 rounded-full border-2 border-stone-300"></div>
              Respond anonymously
            </button>
          </div>

          <div className="bg-stone-100 rounded-2xl px-5 py-4 mt-2">
            <p className="text-xs text-stone-500 leading-relaxed">
              Your job is not to fix. Your job is to be present. If you don't have something genuinely useful to offer, it is okay to simply say — I see you.
            </p>
          </div>

          <button className="w-full bg-stone-800 text-white py-4 px-6 rounded-2xl text-base font-medium hover:bg-stone-700 transition-colors">
            Send your voice
          </button>

        </div>

      </div>
    </main>
  );
}
