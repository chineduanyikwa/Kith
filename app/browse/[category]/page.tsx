import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import { categoryDisplayName } from '@/lib/categories'
import CategoryFeedList from './CategoryFeedList'
import CategoryFollowButton from './CategoryFollowButton'

const PAGE_SIZE = 10

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>
}): Promise<Metadata> {
  const { category } = await params
  const display = categoryDisplayName(category)
  return {
    title: `${display} — Kith`,
    description: `Read what people in the ${display} circle are carrying. Show up for someone today.`,
  }
}

export default async function CategoryFeed({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>
  searchParams: Promise<{ intent?: string }>
}) {
  const { category } = await params
  const { intent } = await searchParams
  const categoryName = categoryDisplayName(category);

  const { data: posts } = await supabase
    .from('posts')
    .select('*, profiles!posts_user_id_profiles_fkey(username)')
    .eq('category', category)
    .eq('hidden', false)
    .order('created_at', { ascending: false })
    .range(0, PAGE_SIZE - 1)

  return (
    <main className="min-h-screen bg-stone-50 px-4 md:px-6 py-6 md:py-10">
      <div className="max-w-md mx-auto">
        <div className="mb-8">
          <a href={intent ? `/browse?intent=${intent}` : '/browse'} className="inline-flex items-center min-h-[44px] text-sm text-stone-400 hover:text-stone-600">
            Back to Categories
          </a>
          <div className="flex items-start justify-between gap-3 mt-2">
            <h1 className="text-2xl md:text-3xl font-bold text-stone-800">{categoryName}</h1>
            <div className="pt-2">
              <CategoryFollowButton category={category} />
            </div>
          </div>
          <p className="text-stone-500 mt-1">Real people. Real pain. Real support.</p>
        </div>
        <CategoryFeedList
          category={category}
          intent={intent}
          initialPosts={posts ?? []}
        />
        <p className="text-xs text-stone-400 text-center pt-12">
          Kith is a peer support community, not a substitute for professional help.
        </p>
      </div>
    </main>
  )
}
