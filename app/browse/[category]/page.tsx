import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import CategoryFeedList from './CategoryFeedList'

const PAGE_SIZE = 10

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>
}): Promise<Metadata> {
  const { category } = await params
  const decoded = decodeURIComponent(category).replace(/-/g, ' ')
  const capitalised = decoded.replace(/\b\w/g, (l) => l.toUpperCase())
  return {
    title: `${capitalised} — Kith`,
    description: `Read what people in the ${decoded} circle are carrying. Show up for someone today.`,
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
  const categoryName = decodeURIComponent(category).replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  const { data: posts } = await supabase
    .from('posts')
    .select('*, profiles!posts_user_id_profiles_fkey(username)')
    .eq('category', category)
    .order('created_at', { ascending: false })
    .range(0, PAGE_SIZE - 1)

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-10">
      <div className="max-w-md mx-auto">
        <div className="mb-8">
          <a href={intent ? `/browse?intent=${intent}` : '/browse'} className="text-sm text-stone-400 hover:text-stone-600">
            Back to Categories
          </a>
          <h1 className="text-3xl font-bold text-stone-800 mt-2 capitalize">{categoryName}</h1>
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
