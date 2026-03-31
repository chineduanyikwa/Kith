import { supabase } from '@/lib/supabase'

export default async function PostPage({
  params,
}: {
  params: Promise<{ category: string; post: string }>;
}) {
  const { category, post: postId } = await params;
  const categoryName = decodeURIComponent(category).replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

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
          <a href={`/browse/${category}`} className="text-sm text-stone-400">Back to {categoryName}</a>
          <p className="text-stone-500 mt-8">Post not found.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-10">
      <div className="max-w-md mx-auto">

        <div className="mb-6">
          <a href={`/browse/${category}`} className="text-sm text-stone-400 hover:text-stone-600">
            Back to {categoryName}
          </a>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl px-5 py-6 mb-6">
          <p className="text-stone-800 text-base leading-relaxed">{post.content}</p>
          <div className="flex items-center gap-3 mt-4">
            <span className="text-xs text-stone-400">{post.anonymous ? 'Anonymous' : 'A member of Kith'}</span>
            <span className="text-xs text-stone-400">{new Date(post.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm text-stone-500">{responses ? responses.length : 0} people showed up</p>
        </div>

        <div className="space-y-3 mb-8">
          {responses && responses.length > 0 ? (
            responses.map((response) => (
              <div key={response.id} className="bg-white border border-stone-200 rounded-2xl px-5 py-4">
                <p className="text-stone-700 text-sm leading-relaxed">{response.content}</p>
                <div className="flex items-center gap-3 mt-3">
                  <span className="text-xs font-medium text-stone-500">{response.anonymous ? 'Anonymous' : 'A member of Kith'}</span>
                  <span className="text-xs text-stone-400">{new Date(response.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-stone-400 text-sm">No responses yet.</p>
              <p className="text-stone-400 text-sm mt-1">Be the first to show up.</p>
            </div>
          )}
        </div>

        <a
          href={`/respond?post_id=${postId}&category=${category}`}
          className="block w-full bg-stone-800 text-white py-4 px-6 rounded-2xl text-base font-medium text-center hover:bg-stone-700 transition-colors"
        >
          Respond to this
        </a>

      </div>
    </main>
  );
}
