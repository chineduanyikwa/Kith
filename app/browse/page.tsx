import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default async function Browse({
  searchParams,
}: {
  searchParams: Promise<{ intent?: string }>;
}) {
  const { intent } = await searchParams;

  const { data: rows } = await supabase.from('posts').select('category')
  const counts: Record<string, number> = {}
  for (const row of rows ?? []) {
    counts[row.category] = (counts[row.category] || 0) + 1
  }

  const categories = [
    { name: "Grief", description: "" },
    { name: "Relationships", description: "" },
    { name: "Family", description: "" },
    { name: "Work & Career", description: "" },
    { name: "Loneliness", description: "" },
    { name: "Identity", description: "" },
    { name: "Mental Health", description: "Anxiety, depression, burnout, emptiness. The feelings that are hard to name and harder to carry alone." },
    { name: "Finances", description: "" },
    { name: "Health", description: "" },
    { name: "Everything Else", description: "If it does not fit anywhere else, it belongs here." },
  ];

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-10">
      <div className="max-w-md mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-stone-800">
            {intent === "talk" ? "Where does it hurt?" : "What brings you here?"}
          </h1>
          <p className="text-stone-500 mt-2">
            {intent === "talk" ? "Choose a space and speak freely." : "Choose a space that feels right."}
          </p>
          <p className="text-sm text-stone-400 mt-3">
            {intent === "talk" ? (
              <>
                Want to <Link href="/browse?intent=help" className="text-stone-600 underline-offset-2 hover:text-stone-800 hover:underline">help instead</Link>?
              </>
            ) : (
              <>
                <Link href="/browse?intent=talk" className="text-stone-600 underline-offset-2 hover:text-stone-800 hover:underline">Need to talk instead</Link>? That's okay too.
              </>
            )}
          </p>
        </div>
        <div className="space-y-3">
          {categories.map((category) => {
            const slug = category.name.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-');
            const href = intent === "talk"
              ? `/post?category=${slug}`
              : `/browse/${slug}`;
            return (
              <a
                key={category.name}
                href={href}
                className="block bg-white shadow-card rounded-xl bg-card px-5 py-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-stone-800">{category.name}</span>
                  {intent === "talk" ? null : (
                    <span className="text-sm text-stone-400">{counts[slug] || 0} {counts[slug] === 1 ? 'voice' : 'voices'}</span>
                  )}
                </div>
                {category.description ? (
                  <p className="text-sm text-stone-400 mt-2">{category.description}</p>
                ) : null}
              </a>
            );
          })}
        </div>
      </div>
    </main>
  );
}
