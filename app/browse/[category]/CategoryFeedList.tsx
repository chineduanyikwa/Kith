'use client'

import { useState } from 'react'
import * as Sentry from '@sentry/nextjs'
import { supabase } from '@/lib/supabase'
import { formatWAT } from '@/lib/time'

const PAGE_SIZE = 10

const SUPPORT_LABELS: Record<string, string> = {
  let_it_out: 'Just let it out',
  encouragement: 'Encouragement',
  perspective: 'Perspective',
  practical_advice: 'Practical advice',
  shared_experience: 'Shared experience',
}

type Post = {
  id: number
  content: string
  support_type: string | null
  anonymous: boolean
  created_at: string
  profiles: { username: string | null } | null
}

export default function CategoryFeedList({
  category,
  intent,
  initialPosts,
}: {
  category: string
  intent?: string
  initialPosts: Post[]
}) {
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [hasMore, setHasMore] = useState(initialPosts.length === PAGE_SIZE)
  const [loading, setLoading] = useState(false)

  async function loadMore() {
    setLoading(true)
    const from = posts.length
    const to = from + PAGE_SIZE - 1
    const { data, error } = await supabase
      .from('posts')
      .select('*, profiles!posts_user_id_profiles_fkey(username)')
      .eq('category', category)
      .eq('hidden', false)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error || !data) {
      if (error) {
        Sentry.withScope((scope) => {
          scope.setTags({ page: 'browse-category', op: 'select', table: 'posts' })
          scope.setContext('supabase', { category })
          Sentry.captureException(error)
        })
      }
      setLoading(false)
      return
    }

    setPosts((prev) => [...prev, ...(data as Post[])])
    if (data.length < PAGE_SIZE) setHasMore(false)
    setLoading(false)
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-stone-400 text-sm">It&apos;s quiet in this space.</p>
        <p className="text-stone-400 text-sm mt-1">Be the first to speak.</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {posts.map((post) => (
          <a
            href={`/browse/${category}/${post.id}${intent ? `?intent=${intent}` : ''}`}
            key={post.id}
            className="block bg-white shadow-card rounded-xl bg-card px-5 py-4 hover:shadow-md transition-shadow"
          >
            {post.support_type && SUPPORT_LABELS[post.support_type] && (
              <span className="inline-block text-xs font-medium text-stone-500 bg-stone-100 px-2 py-1 rounded-full mb-2">
                Needs: {SUPPORT_LABELS[post.support_type]}
              </span>
            )}
            <p className="text-stone-700 text-sm leading-relaxed">{post.content}</p>
            <div className="flex items-center gap-4 mt-3">
              <span className="text-xs text-stone-400">{post.anonymous ? 'Anonymous' : (post.profiles?.username ?? 'Anonymous')}</span>
              <span className="text-xs text-stone-400">{formatWAT(post.created_at)}</span>
            </div>
          </a>
        ))}
      </div>
      {hasMore && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="text-sm text-stone-600 border border-stone-200 bg-white px-5 py-2 rounded-xl hover:bg-stone-50 transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </>
  )
}
