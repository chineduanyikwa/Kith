export default function Browse() {
  const categories = [
    { name: "Grief", posts: 24, description: "" },
    { name: "Relationships", posts: 41, description: "" },
    { name: "Family", posts: 18, description: "" },
    { name: "Work & Career", posts: 33, description: "" },
    { name: "Loneliness", posts: 29, description: "" },
    { name: "Identity", posts: 15, description: "" },
    { name: "Mental Health", posts: 37, description: "Anxiety, depression, burnout, emptiness. The feelings that are hard to name and harder to carry alone." },
    { name: "Finances", posts: 12, description: "" },
    { name: "Health", posts: 9, description: "" },
    { name: "Everything Else", posts: 21, description: "If it does not fit anywhere else, it belongs here." },
  ];

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-10">
      <div className="max-w-md mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-stone-800">What brings you here?</h1>
          <p className="text-stone-500 mt-2">Choose a space that feels right.</p>
        </div>
        <div className="space-y-3">
          {categories.map((category) => (
            <a
              key={category.name}
              href={`/browse/${category.name.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`}
              className="block bg-white border border-stone-200 rounded-2xl px-5 py-4 hover:border-stone-400 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-stone-800">{category.name}</span>
                <span className="text-sm text-stone-400">{category.posts} voices</span>
              </div>
              {category.description ? (
                <p className="text-sm text-stone-400 mt-2">{category.description}</p>
              ) : null}
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
