import { supabase } from '@/lib/supabase'

const SUPPORT_LABELS: Record<string, string> = {
  let_it_out: 'Just let it out',
  encouragement: 'Encouragement',
  perspective: 'Perspective',
  practical_advice: 'Practical advice',
  shared_experience: 'Shared experience',
}

export default async function CategoryFeed({
  params,
}: {
  params: Promise<{ category: string }>
}) {
  const { category } = await params
  const categoryName = decodeURIComponent(category).replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  const { data: posts } = await supabase
    .from('posts')
    .select('*, profiles!posts_user_id_profiles_fkey(username)')
    .eq('category', category)
    .order('created_at', { ascending: false })

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-10">
      <div className="max-w-md mx-auto">
        <div className="mb-8">
          <a href="/browse?intent=help" className="text-sm text-stone-400 hover:text-stone-600">
            Back to Categories
          </a>
          <h1 className="text-3xl font-bold text-stone-800 mt-2 capitalize">{categoryName}</h1>
          <p className="text-stone-500 mt-1">Real people. Real pain. Real support.</p>
        </div>
        <div className="space-y-3">
          {posts && posts.length > 0 ? (
            posts.map((post) => (
              <a
                href={`/browse/${category}/${post.id}`}
                key={post.id}
                className="block bg-white border border-stone-200 rounded-2xl px-5 py-4 hover:border-stone-400 transition-colors"
              >
                {post.support_type && SUPPORT_LABELS[post.support_type] && (
                  <span className="inline-block text-xs font-medium text-stone-500 bg-stone-100 px-2 py-1 rounded-full mb-2">
                    Needs: {SUPPORT_LABELS[post.support_type]}
                  </span>
                )}
                <p className="text-stone-700 text-sm leading-relaxed">{post.content}</p>
                <div className="flex items-center gap-4 mt-3">
                  <span className="text-xs text-stone-400">{post.anonymous ? 'Anonymous' : (post.profiles?.username ?? 'A member of Kith')}</span>
                  <span className="text-xs text-stone-400">{new Date(post.created_at).toLocaleDateString()}</span>
                </div>
              </a>
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-stone-400 text-sm">No posts yet in this space.</p>
              <p className="text-stone-400 text-sm mt-1">Be the first to speak.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
