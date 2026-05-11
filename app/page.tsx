import OnboardingModal from "./components/OnboardingModal";

export default function Home() {
  return (
    <main className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-4 md:px-6 py-8">
      <OnboardingModal />
      <div className="max-w-md w-full text-center space-y-6 md:space-y-8">
        <div className="space-y-3">
          <h1 className="text-5xl md:text-6xl font-bold text-stone-800 tracking-tight">
            Kith
          </h1>
          <p className="text-base md:text-lg text-stone-500 leading-relaxed">
            Some things are too heavy for one person.
          </p>
        </div>
        <div className="space-y-3 pt-4">
          <a href="/browse?intent=talk" className="flex items-center justify-center min-h-[44px] w-full bg-stone-800 text-white py-4 px-6 rounded-2xl text-base font-medium hover:opacity-90 transition-opacity">
            I need to talk
          </a>
          <a href="/browse?intent=help" className="flex items-center justify-center min-h-[44px] w-full bg-white shadow-card rounded-xl bg-card px-5 py-4 text-base font-medium text-stone-800 hover:shadow-md transition-shadow">
            I want to help
          </a>
          <p className="text-sm text-stone-500 pt-2">
            You can do both. Most people do.
          </p>
        </div>
        <p className="text-xs text-stone-400 pt-4">
          Kith is a peer support community, not a substitute for professional help.
        </p>
      </div>
    </main>
  );
}
