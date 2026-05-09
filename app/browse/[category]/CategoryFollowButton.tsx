'use client'

import { useEffect, useState } from 'react'
import * as Sentry from '@sentry/nextjs'
import { supabase } from '@/lib/supabase'

export default function CategoryFollowButton({ category }: { category: string }) {
  const [userId, setUserId] = useState<string | null>(null)
  const [following, setFollowing] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled) return
      if (!user) {
        setLoaded(true)
        return
      }
      setUserId(user.id)
      const { data } = await supabase
        .from('category_follows')
        .select('id')
        .eq('user_id', user.id)
        .eq('category', category)
        .limit(1)
      if (!cancelled) {
        setFollowing((data?.length ?? 0) > 0)
        setLoaded(true)
      }
    }
    load()
    return () => { cancelled = true }
  }, [category])

  async function toggle() {
    if (!userId || busy) return
    setBusy(true)
    if (following) {
      const { error } = await supabase
        .from('category_follows')
        .delete()
        .eq('user_id', userId)
        .eq('category', category)
      if (error) {
        Sentry.withScope((scope) => {
          scope.setTags({ page: 'browse-category', op: 'delete', table: 'category_follows' })
          scope.setContext('supabase', { category })
          Sentry.captureException(error)
        })
        setBusy(false)
        return
      }
      setFollowing(false)
    } else {
      const { error } = await supabase
        .from('category_follows')
        .insert({ user_id: userId, category })
      if (error && !/duplicate key|unique/i.test(error.message)) {
        Sentry.withScope((scope) => {
          scope.setTags({ page: 'browse-category', op: 'insert', table: 'category_follows' })
          scope.setContext('supabase', { category })
          Sentry.captureException(error)
        })
        setBusy(false)
        return
      }
      setFollowing(true)
    }
    setBusy(false)
  }

  if (!loaded || !userId) return null

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className="text-xs text-stone-600 border border-stone-300 px-3 py-1.5 rounded-full hover:border-stone-800 hover:text-stone-800 transition-colors disabled:opacity-40"
    >
      {busy ? '…' : following ? 'Following' : 'Follow'}
    </button>
  )
}
