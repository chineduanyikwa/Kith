export default function Home() {
  return (
    <main className="bg-stone-50 flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="space-y-3">
          <h1 className="text-6xl font-bold text-stone-800 tracking-tight">
            Kith
          </h1>
          <p className="text-lg text-stone-500 leading-relaxed">
            Some things are too heavy for one person.
          </p>
        </div>
        <div className="space-y-3 pt-4">
          <a href="/browse?intent=talk" className="block w-full bg-stone-800 text-white py-4 px-6 rounded-2xl text-base font-medium hover:bg-stone-700 transition-colors">
            I need to talk
          </a>
          <a href="/browse?intent=help" className="block w-full border border-stone-300 text-stone-700 py-4 px-6 rounded-2xl text-base font-medium hover:bg-stone-100 transition-colors">
            I want to help
          </a>
        </div>
        <p className="text-xs text-stone-400 pt-4">
          Kith is a peer support community, not a substitute for professional help.
        </p>
      </div>
    </main>
  );
}
