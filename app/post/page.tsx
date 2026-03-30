export default function NewPost() {
  return (
    <main className="min-h-screen bg-stone-50 px-6 py-10">
      <div className="max-w-md mx-auto">

        <div className="mb-8">
          <a href="/browse" className="text-sm text-stone-400 hover:text-stone-600">
            Back to categories
          </a>
          <h1 className="text-3xl font-bold text-stone-800 mt-2">What's on your heart?</h1>
          <p className="text-stone-500 mt-1">This is your space. Say it however it comes.</p>
        </div>

        <div className="space-y-4">

          <div>
            <label className="text-sm font-medium text-stone-600 block mb-2">
              Choose a category
            </label>
            <select className="w-full bg-white border border-stone-200 rounded-2xl px-5 py-4 text-stone-700 text-sm focus:outline-none focus:border-stone-400">
              <option value="">Select a space...</option>
              <option value="grief">Grief</option>
              <option value="relationships">Relationships</option>
              <option value="family">Family</option>
              <option value="work-career">Work & Career</option>
              <option value="loneliness">Loneliness</option>
              <option value="identity">Identity</option>
              <option value="mental-health">Mental Health</option>
              <option value="finances">Finances</option>
              <option value="health">Health</option>
              <option value="everything-else">Everything Else</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-stone-600 block mb-2">
              Your post
            </label>
            <textarea
              placeholder="Say what you need to say..."
              rows={6}
              className="w-full bg-white border border-stone-200 rounded-2xl px-5 py-4 text-stone-700 text-sm focus:outline-none focus:border-stone-400 resize-none"
            />
          </div>

          <div className="flex items-center gap-4 pt-2">
            <button className="flex items-center gap-2 text-sm text-stone-500">
              <div className="w-5 h-5 rounded-full border-2 border-stone-300"></div>
              Post as yourself
            </button>
            <button className="flex items-center gap-2 text-sm text-stone-500">
              <div className="w-5 h-5 rounded-full border-2 border-stone-300"></div>
              Post anonymously
            </button>
          </div>

          <button className="w-full bg-stone-800 text-white py-4 px-6 rounded-2xl text-base font-medium hover:bg-stone-700 transition-colors mt-4">
            Let it out
          </button>

        </div>

      </div>
    </main>
  );
}
