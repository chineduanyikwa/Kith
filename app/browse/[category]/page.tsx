export default async function CategoryFeed({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const categoryName = decodeURIComponent(category).replace(/-/g, " ");

  const posts = [
    { id: 1, summary: "I lost my mother three weeks ago and I don't know how to keep going.", responses: 4, time: "2h ago" },
    { id: 2, summary: "Everyone keeps telling me to be strong but I'm exhausted from pretending.", responses: 7, time: "5h ago" },
    { id: 3, summary: "It's been a year and people expect me to be over it. I'm not.", responses: 2, time: "1d ago" },
    { id: 4, summary: "I don't know how to grieve someone I had a complicated relationship with.", responses: 9, time: "2d ago" },
  ];

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-10">
      <div className="max-w-md mx-auto">
        <div className="mb-8">
          <a href="/browse" className="text-sm text-stone-400 hover:text-stone-600">
            Back to categories
          </a>
          <h1 className="text-3xl font-bold text-stone-800 mt-2 capitalize">{categoryName}</h1>
          <p className="text-stone-500 mt-1">Real people. Real pain. Real support.</p>
        </div>
        <div className="space-y-3 mb-8">
          {posts.map((post) => (
            <a key={post.id} href="#" className="block bg-white border border-stone-200 rounded-2xl px-5 py-4 hover:border-stone-400 transition-colors">
              <p className="text-stone-700 text-sm leading-relaxed">{post.summary}</p>
              <div className="flex items-center gap-4 mt-3">
                <span className="text-xs text-stone-400">{post.responses} responses</span>
                <span className="text-xs text-stone-400">{post.time}</span>
              </div>
            </a>
          ))}
        </div>
        <a href="#" className="block w-full bg-stone-800 text-white py-4 px-6 rounded-2xl text-base font-medium text-center hover:bg-stone-700 transition-colors">
          Add your voice
        </a>
      </div>
    </main>
  );
}
