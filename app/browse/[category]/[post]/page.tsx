import { supabase } from '@/lib/supabase'

const SUPPORT_LABELS: Record<string, string> = {
  let_it_out: 'Just let it out',
  encouragement: 'Encouragement',
  perspective: 'Perspective',
  practical_advice: 'Practical advice',
  shared_experience: 'Shared experience',
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ category: string; post: string }>
}) {
  const { category, post: postId } = await params
  const categoryName = decodeURIComponent(category).replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())

  const { data: post } = await supabase
    .from('posts')
    .select('*')
    .eq('id', postId)
    .single()

  const { data: responses } = await supabase
    .from('responses')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })

  if (!post) {
    return (
      <main className="min-h-screen bg-stone-50 px-6 py-10">
        <div className="max-w-md mx-auto">
          <a href={`/browse/${category}`} className="text-sm text-stone-400 hover:text-stone-600">
            Back to {categoryName}
          </a>
          <p className="text-stone-400 mt-4">Post not found.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-8">
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <a href={`/browse/${category}`} className="text-sm text-stone-400 hover:text-stone-600">
            Back to {categoryName}
          </a>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl px-5 py-5 mb-6">
          {post.support_type && SUPPORT_LABELS[post.support_type] && (
            <span className="inline-block text-xs font-medium text-stone-500 bg-stone-100 px-2 py-1 rounded-full mb-3">
              Needs: {SUPPORT_LABELS[post.support_type]}
            </span>
          )}
          <p className="text-stone-700 text-sm leading-relaxed">{post.content}</p>
          <div className="flex items-center gap-3 mt-4">
            <span className="text-xs text-stone-400">{post.anonymous ? 'A member of Kith' : 'Anonymous'}</span>
            <span className="text-xs text-stone-400">{new Date(post.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm text-stone-500">
            {responses && responses.length > 0
              ? `${responses.length} ${responses.length === 1 ? 'person' : 'people'} showed up`
              : 'No responses yet. Be the first to show up.'}
          </p>
        </div>

        <div className="space-y-3">
          {responses && responses.length > 0 ? (
            responses.map((response) => (
              <div key={response.id} className="bg-white border border-stone-200 rounded-2xl px-5 py-4">
                <p className="text-stone-700 text-sm leading-relaxed">{response.content}</p>
                <div className="flex items-center gap-3 mt-3">
                  <span className="text-xs text-stone-400">{response.anonymous ? 'A member of Kith' : 'Anonymous'}</span>
                  <span className="text-xs text-stone-400">{new Date(response.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-stone-400 text-sm">Be the first to show up.</p>
            </div>
          )}
        </div>

        <a href={`/respond?post_id=${postId}&category=${category}`} className="block w-full bg-stone-800 text-white py-4 px-6 rounded-2xl text-base font-medium text-center hover:bg-stone-700 transition-colors mt-6">
          Respond to this
        </a>
      </div>
    </main>
  )
}