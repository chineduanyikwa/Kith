'use client'

import { useState, Suspense, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import * as Sentry from '@sentry/nextjs'
import { supabase } from '@/lib/supabase'
import { containsCrisisLanguage, MANI_NUMBER } from '@/lib/crisis'
import { containsProfanity } from '@/lib/moderation'
import type { User } from '@supabase/supabase-js'

const SUPPORT_LABELS: Record<string, string> = {
  let_it_out: 'Just let it out',
  encouragement: 'Encouragement',
  perspective: 'Perspective',
  practical_advice: 'Practical advice',
  shared_experience: 'Shared experience',
}

const STARTER_PROMPTS = [
  "That sounds really heavy.",
  "It's okay to feel this way.",
  "I've been through something like this too.",
  "You don't have to carry this alone.",
]

type ParentResponse = {
  id: number
  content: string
  user_id: string | null
  parent_id: number | null
  anonymous: boolean
  profiles?: { username: string } | null
}

async function blockExistsBetween(a: string, b: string): Promise<boolean> {
  const { data } = await supabase
    .from('blocks')
    .select('id')
    .or(
      `and(blocker_id.eq.${a},blocked_id.eq.${b}),and(blocker_id.eq.${b},blocked_id.eq.${a})`,
    )
    .limit(1)
  return (data?.length ?? 0) > 0
}

async function isReplyAllowed(
  parentId: number,
  postAuthorId: string | null | undefined,
  currentUserId: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!postAuthorId) return { ok: false, reason: 'Could not load this thread.' }

  const { data: parent } = await supabase
    .from('responses')
    .select('id, user_id, parent_id')
    .eq('id', parentId)
    .single()
  if (!parent) return { ok: false, reason: 'The response you are replying to could not be found.' }

  const { count: existingChildren } = await supabase
    .from('responses')
    .select('*', { count: 'exact', head: true })
    .eq('parent_id', parentId)
  if ((existingChildren ?? 0) > 0) {
    return { ok: false, reason: 'Someone has already replied to this.' }
  }

  // Walk up the parent chain to find the top-level response, whose author is the
  // helper for this thread. The thread is strictly between postAuthorId and that
  // helper, with strict alternation.
  type ChainRow = { id: number; user_id: string | null; parent_id: number | null }
  let cursor: ChainRow = parent as ChainRow
  while (cursor.parent_id != null) {
    const result = await supabase
      .from('responses')
      .select('id, user_id, parent_id')
      .eq('id', cursor.parent_id)
      .single<ChainRow>()
    if (!result.data) return { ok: false, reason: 'Could not load this thread.' }
    cursor = result.data
  }
  const helperId = cursor.user_id
  if (!helperId) return { ok: false, reason: 'Could not load this thread.' }

  const participants = new Set([postAuthorId, helperId])
  if (!participants.has(currentUserId)) {
    return { ok: false, reason: 'Only the two people in this thread can reply.' }
  }
  if (!participants.has(parent.user_id ?? '')) {
    return { ok: false, reason: 'This thread is between two specific people.' }
  }
  if (parent.user_id === currentUserId) {
    return { ok: false, reason: 'You cannot reply to your own response.' }
  }
  return { ok: true }
}

function RespondForm() {
  const searchParams = useSearchParams()
  const postId = searchParams.get('post_id') || ''
  const category = searchParams.get('category') || ''
  const parentIdParam = searchParams.get('parent_id')
  const parentId = parentIdParam ? parseInt(parentIdParam) : null
  const isReplyMode = parentId !== null && !Number.isNaN(parentId)

  const [post, setPost] = useState<{ content: string; anonymous: boolean; support_type?: string; user_id?: string | null } | null>(null)
  const [parent, setParent] = useState<ParentResponse | null>(null)
  const [content, setContent] = useState('')
  const [hideUsername, setHideUsername] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rateLimitError, setRateLimitError] = useState('')
  const [showCheck, setShowCheck] = useState(false)
  const [showCrisis, setShowCrisis] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [autoSubmitting, setAutoSubmitting] = useState(false)
  const router = useRouter()

  const MIN_LENGTH = 15
  const MAX_LENGTH = 1500

  useEffect(() => {
    async function loadPost() {
      const { data } = await supabase
        .from('posts')
        .select('content, anonymous, support_type, user_id')
        .eq('id', postId)
        .eq('hidden', false)
        .single()
      if (data) setPost(data)
    }
    if (postId) loadPost()
  }, [postId])

  useEffect(() => {
    async function loadParent() {
      if (!isReplyMode || parentId === null) return
      const { data } = await supabase
        .from('responses')
        .select('id, content, user_id, parent_id, anonymous, profiles!responses_user_id_profiles_fkey(username)')
        .eq('id', parentId)
        .eq('hidden', false)
        .single<ParentResponse>()
      if (data) setParent(data)
    }
    loadParent()
  }, [isReplyMode, parentId])

  useEffect(() => {
    async function init() {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (currentUser) {
        setUser(currentUser)
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', currentUser.id)
          .single()
        if (profile) setUsername(profile.username)
      }

      const pending = localStorage.getItem('kith_pending_response')
      if (pending && currentUser) {
        localStorage.removeItem('kith_pending_response')
        const saved = JSON.parse(pending)
        setAutoSubmitting(true)
        const { data: postRow } = await supabase
          .from('posts')
          .select('user_id')
          .eq('id', parseInt(saved.postId))
          .single()
        if (postRow?.user_id && postRow.user_id !== currentUser.id) {
          const blocked = await blockExistsBetween(currentUser.id, postRow.user_id)
          if (blocked) {
            setAutoSubmitting(false)
            setError('Something went wrong. Please try again.')
            return
          }
        }
        const insert: Record<string, unknown> = {
          content: saved.content,
          post_id: parseInt(saved.postId),
          anonymous: saved.hideUsername ?? false,
          user_id: currentUser.id,
        }
        if (saved.parentId) insert.parent_id = parseInt(saved.parentId)
        const { data: inserted, error } = await supabase
          .from('responses')
          .insert(insert)
          .select('id')
          .single()
        if (error) {
          console.error(error)
          Sentry.withScope((scope) => {
            scope.setTags({ page: 'respond', op: 'insert', table: 'responses', source: 'auto-submit' })
            scope.setContext('supabase', { postId: saved.postId, parentId: saved.parentId ?? null })
            Sentry.captureException(error)
          })
          setAutoSubmitting(false)
        } else {
          if (inserted?.id) {
            const notifyPath = saved.parentId
              ? '/api/notifications/reply'
              : '/api/notifications/response'
            fetch(notifyPath, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ responseId: inserted.id }),
              keepalive: true,
            }).catch(() => {})
          }
          router.push(`/browse/${saved.category}/${saved.postId}`)
        }
      }
    }
    init()
  }, [router])

  const validate = () => {
    const trimmed = content.trim()
    if (trimmed.length === 0) {
      return 'Please add a few words.'
    }
    if (!isReplyMode && trimmed.length < MIN_LENGTH) {
      return `Please share a little more — at least ${MIN_LENGTH} characters.`
    }
    if (trimmed.length > MAX_LENGTH) {
      return `Please keep your response under ${MAX_LENGTH} characters.`
    }
    return null
  }

  function handleAddVoice() {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    if (containsProfanity(content)) {
      setError("Your message contains language that isn't allowed on Kith.")
      return
    }
    if (isReplyMode) {
      handleSubmit()
      return
    }
    setShowCheck(true)
  }

  async function handleSubmit(skipCrisisCheck = false) {
    setShowCheck(false)
    setRateLimitError('')

    if (!skipCrisisCheck && containsCrisisLanguage(content)) {
      setShowCrisis(true)
      return
    }

    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) {
      localStorage.setItem('kith_pending_response', JSON.stringify({
        content: content.trim(),
        postId,
        category,
        hideUsername,
        parentId: isReplyMode ? String(parentId) : undefined,
      }))
      const replyParam = isReplyMode ? `&parent_id=${parentId}` : ''
      router.push('/auth?next=' + encodeURIComponent(`/respond?post_id=${postId}&category=${category}${replyParam}`))
      return
    }

    setLoading(true)

    if (isReplyMode && parentId !== null) {
      const check = await isReplyAllowed(parentId, post?.user_id ?? null, currentUser.id)
      if (!check.ok) {
        setLoading(false)
        setError(check.reason)
        return
      }
    } else {
      const { count: existingTopLevel } = await supabase
        .from('responses')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', parseInt(postId))
        .eq('user_id', currentUser.id)
        .is('parent_id', null)
      if ((existingTopLevel ?? 0) > 0) {
        setLoading(false)
        setError('You have already responded here. Continue the conversation by replying within your existing thread.')
        return
      }
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count: recentCount } = await supabase
      .from('responses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', currentUser.id)
      .gt('created_at', oneHourAgo)
    if ((recentCount ?? 0) >= 10) {
      setLoading(false)
      setRateLimitError("You've been showing up a lot today. Rest a little and come back.")
      return
    }

    if (post?.user_id && post.user_id !== currentUser.id) {
      const blocked = await blockExistsBetween(currentUser.id, post.user_id)
      if (blocked) {
        setLoading(false)
        setError('Something went wrong. Please try again.')
        return
      }
    }

    const insert: Record<string, unknown> = {
      content: content.trim(),
      post_id: parseInt(postId),
      anonymous: hideUsername,
      user_id: currentUser.id,
    }
    if (isReplyMode && parentId !== null) insert.parent_id = parentId

    const { data: inserted, error } = await supabase
      .from('responses')
      .insert(insert)
      .select('id')
      .single()
    if (error) {
      console.error(error)
      Sentry.withScope((scope) => {
        scope.setTags({ page: 'respond', op: 'insert', table: 'responses', isReply: String(isReplyMode) })
        scope.setContext('supabase', { postId, parentId: isReplyMode ? parentId : null })
        Sentry.captureException(error)
      })
      setLoading(false)
      setError(`Could not send your ${isReplyMode ? 'reply' : 'response'} right now. Please try again in a moment.`)
      return
    } else {
      if (inserted?.id) {
        const notifyPath = isReplyMode
          ? '/api/notifications/reply'
          : '/api/notifications/response'
        fetch(notifyPath, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ responseId: inserted.id }),
          keepalive: true,
        }).catch(() => {})
      }
      router.push(`/browse/${category}/${postId}`)
    }
  }

  if (autoSubmitting) {
    return (
      <main className="min-h-screen bg-stone-50 px-6 py-10">
        <div className="max-w-xl mx-auto pt-12 text-center">
          <p className="text-stone-500 text-sm">Submitting your response...</p>
        </div>
      </main>
    )
  }

  if (showCrisis) {
    return (
      <main className="min-h-screen bg-stone-50 px-4 py-8">
        <div className="max-w-lg mx-auto pt-12">
          <p className="text-stone-800 text-lg font-medium mb-3">One moment before this sends.</p>
          <p className="text-stone-600 text-sm leading-relaxed mb-8">
            Some of what you wrote stayed with us. Are you doing okay right now?
          </p>
          <div className="shadow-card rounded-xl bg-card px-5 py-4 mb-8">
            <p className="text-stone-700 text-sm font-medium mb-1">If you want to talk to someone right now</p>
            <p className="text-stone-600 text-sm mb-2">Mentally Aware Nigeria Initiative (MANI) is a free listening line. No judgment, just someone who'll hear you out.</p>
            <p className="text-stone-800 text-base font-semibold">{MANI_NUMBER}</p>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => { setShowCrisis(false); handleSubmit(true) }}
              disabled={loading}
              className="block w-full bg-stone-800 text-white py-3 px-4 rounded-2xl text-sm font-medium text-center hover:bg-stone-700 transition-colors disabled:opacity-40"
            >
              Send my {isReplyMode ? 'reply' : 'response'}
            </button>
            <button
              onClick={() => { window.location.href = 'tel:' + MANI_NUMBER }}
              className="block w-full border border-stone-300 text-stone-700 py-3 px-4 rounded-2xl text-sm font-medium text-center hover:border-stone-800 transition-colors"
            >
              Call MANI now
            </button>
            <button
              onClick={() => setShowCrisis(false)}
              className="block w-full text-stone-500 py-2 text-sm font-medium text-center hover:text-stone-700 transition-colors"
            >
              Go back and edit
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-10">
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <a href={`/browse/${category}/${postId}`} className="text-sm text-stone-400 hover:text-stone-600">
            Back to Post
          </a>
        </div>
        {isReplyMode ? (
          <div className="bg-white shadow-card rounded-xl bg-card px-6 py-5 mb-6">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-3">
              Replying to
            </p>
            <p className="text-stone-700 text-sm leading-relaxed">
              {parent ? parent.content : 'Loading...'}
            </p>
            {parent && (
              <p className="text-xs text-stone-400 mt-3">
                {parent.anonymous ? 'Anonymous' : (parent.profiles?.username ?? 'A member of Kith')}
              </p>
            )}
          </div>
        ) : (
          <div className="bg-white shadow-card rounded-xl bg-card px-6 py-5 mb-6">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-3">
              You are responding to
            </p>
            {post?.support_type && SUPPORT_LABELS[post.support_type] && (
              <span className="inline-block text-xs font-medium text-stone-500 bg-stone-100 px-2 py-1 rounded-full mb-3">
                Needs: {SUPPORT_LABELS[post.support_type]}
              </span>
            )}
            <p className="text-stone-700 text-sm leading-relaxed">
              {post ? post.content : 'Loading...'}
            </p>
          </div>
        )}
        {!isReplyMode && (
          <div className="shadow-card rounded-xl bg-card px-6 py-5 mb-6">
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-3">How to show up well</p>
            <ul className="space-y-1 mb-4">
              <li className="text-xs text-stone-400 flex items-start gap-2"><span>—</span><span>Listen before advising</span></li>
              <li className="text-xs text-stone-400 flex items-start gap-2"><span>—</span><span>Do not judge or shame</span></li>
              <li className="text-xs text-stone-400 flex items-start gap-2"><span>—</span><span>Do not diagnose</span></li>
              <li className="text-xs text-stone-400 flex items-start gap-2"><span>—</span><span>Do not make promises</span></li>
              <li className="text-xs text-stone-400 flex items-start gap-2"><span>—</span><span>Help them feel less alone</span></li>
            </ul>
            <p className="text-xs text-stone-400 mb-2">A few ways to begin:</p>
            <div className="flex flex-wrap gap-2">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setContent((prev) => prev ? prev + ' ' + prompt : prompt)}
                  className="text-xs bg-white border border-stone-200 text-stone-500 px-3 py-1.5 rounded-full hover:border-stone-400 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-stone-400 block mb-2">{isReplyMode ? 'Your reply' : 'Your response'}</label>
            <textarea
              placeholder={isReplyMode ? 'Reply with care.' : 'Speak from your experience. Just be present.'}
              rows={6}
              value={content}
              onChange={(e) => { setContent(e.target.value); if (error) setError('') }}
              className="w-full bg-white shadow-card rounded-xl bg-card px-5 py-4 text-stone-700 text-sm focus:outline-none focus:border-stone-400 resize-none"
            />
            <div className="flex justify-between mt-1">
              {error ? <p className="text-sm text-red-500">{error}</p> : <span />}
              <p className="text-xs text-stone-400 ml-auto">{content.length}/{MAX_LENGTH}</p>
            </div>
          </div>
          <div className="pt-2">
            {user && username && (
              <p className="text-sm text-stone-500 mb-2">
                {isReplyMode ? 'Replying' : 'Responding'} as <span className="font-medium text-stone-700">{hideUsername ? 'Anonymous' : username}</span>
              </p>
            )}
            <button onClick={() => setHideUsername(!hideUsername)} className="flex items-center gap-2 text-sm text-stone-500">
              <div className={'w-4 h-4 rounded border-2 flex items-center justify-center ' + (hideUsername ? 'border-stone-800 bg-stone-800' : 'border-stone-300')}>
                {hideUsername && <span className="text-white text-xs">✓</span>}
              </div>
              Hide my username for this {isReplyMode ? 'reply' : 'response'}
            </button>
          </div>

          {showCheck ? (
            <div className="bg-white shadow-card rounded-xl bg-card px-6 py-5 mt-4">
              <p className="text-sm font-medium text-stone-700 mb-4">Does this help them feel less alone?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCheck(false)}
                  className="flex-1 border border-stone-200 text-stone-600 py-3 rounded-xl text-sm font-medium hover:border-stone-400 transition-colors"
                >
                  Go back
                </button>
                <button
                  onClick={() => handleSubmit()}
                  disabled={loading}
                  className="flex-1 bg-stone-800 text-white py-3 rounded-xl text-sm font-medium hover:bg-stone-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Yes, send it...' : 'Yes, send it'}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={handleAddVoice} disabled={loading} className="w-full bg-stone-800 text-white py-4 px-6 rounded-2xl text-base font-medium hover:bg-stone-700 transition-colors disabled:opacity-40 mt-4">
              {isReplyMode ? (loading ? 'Send reply...' : 'Send reply') : 'Add your voice'}
            </button>
          )}

          {rateLimitError && (
            <p className="text-sm text-red-500 text-center">{rateLimitError}</p>
          )}
        </div>
      </div>
    </main>
  )
}

export default function Respond() {
  return (
    <Suspense>
      <RespondForm />
    </Suspense>
  )
}
