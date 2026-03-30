export default async function PostPage({
  params,
}: {
  params: Promise<{ category: string; post: string }>;
}) {
  const { category } = await params;
  const categoryName = decodeURIComponent(category).replace(/-/g, " ");

  const post = {
    summary: "I lost my mother three weeks ago and I don't know how to keep going.",
    time: "2h ago",
    anonymous: true,
  };

  const responses = [
    {
      id: 1,
      name: "Anonymous",
      message: "I lost my dad two years ago. The first few weeks are the hardest. You don't have to have it together right now.",
      time: "1h ago",
    },
    {
      id: 2,
      name: "Tolu",
      message: "Grief has no timeline. Be gentle with yourself. We are here with you.",
      time: "45m ago",
    },
    {
      id: 3,
      name: "Anonymous",
      message: "I see you. You don't have to carry this alone.",
      time: "20m ago",
    },
  ];

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-10">
      <div className="max-w-md mx-auto">

        <div className="mb-6">
          <a href={`/browse/${category}`} className="text-sm text-stone-400 hover:text-stone-600">
            Back to {categoryName}
          </a>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl px-5 py-6 mb-6">
          <p className="text-stone-800 text-base leading-relaxed">{post.summary}</p>
          <div className="flex items-center gap-3 mt-4">
            <span className="text-xs text-stone-400">{post.anonymous ? "A member of Kith" : "Anonymous"}</span>
            <span className="text-xs text-stone-400">{post.time}</span>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm text-stone-500">{responses.length} people showed up</p>
        </div>

        <div className="space-y-3 mb-8">
          {responses.map((response) => (
            <div key={response.id} className="bg-white border border-stone-200 rounded-2xl px-5 py-4">
              <p className="text-stone-700 text-sm leading-relaxed">{response.message}</p>
              <div className="flex items-center gap-3 mt-3">
                <span className="text-xs font-medium text-stone-500">{response.name}</span>
                <span className="text-xs text-stone-400">{response.time}</span>
              </div>
            </div>
          ))}
        </div>

        <a
          href="#"
          className="block w-full bg-stone-800 text-white py-4 px-6 rounded-2xl text-base font-medium text-center hover:bg-stone-700 transition-colors"
        >
          Respond to this
        </a>

      </div>
    </main>
  );
}
