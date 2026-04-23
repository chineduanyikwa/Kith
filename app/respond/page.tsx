'use client'

import { useState, Suspense, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
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

function RespondForm() {
  const searchParams = useSearchParams()
  const postId = searchParams.get('post_id') || ''
  const category = searchParams.get('category') || ''

  const [post, setPost] = useState<{ content: string; anonymous: boolean; support_type?: string } | null>(null)
  const [content, setContent] = useState('')
  const [hideUsername, setHideUsername] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rateLimitError, setRateLimitError] = useState('')
  const [showCheck, setShowCheck] = useState(false)
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
        .select('content, anonymous, support_type')
        .eq('id', postId)
        .single()
      if (data) setPost(data)
    }
    if (postId) loadPost()
  }, [postId])

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
        const { error } = await supabase.from('responses').insert({
          content: saved.content,
          post_id: parseInt(saved.postId),
          anonymous: saved.hideUsername ?? false,
          user_id: currentUser.id,
        })
        if (error) {
          console.error(error)
          setAutoSubmitting(false)
        } else {
          router.push(`/browse/${saved.category}/${saved.postId}`)
        }
      }
    }
    init()
  }, [router])

  const validate = () => {
    if (content.trim().length < MIN_LENGTH) {
      return `Please share a little more — at least ${MIN_LENGTH} characters.`
    }
    if (content.trim().length > MAX_LENGTH) {
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
    setShowCheck(true)
  }

  async function handleSubmit() {
    setShowCheck(false)
    setRateLimitError('')

    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) {
      localStorage.setItem('kith_pending_response', JSON.stringify({
        content: content.trim(),
        postId,
        category,
        hideUsername,
      }))
      router.push('/auth?next=' + encodeURIComponent(`/respond?post_id=${postId}&category=${category}`))
      return
    }

    setLoading(true)

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

    const { error } = await supabase.from('responses').insert({
      content: content.trim(),
      post_id: parseInt(postId),
      anonymous: hideUsername,
      user_id: currentUser.id,
    })
    if (error) {
      console.error(error)
      setLoading(false)
    } else {
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

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-10">
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <a href={`/browse/${category}/${postId}`} className="text-sm text-stone-400 hover:text-stone-600">
            Back to Post
          </a>
        </div>
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
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-stone-400 block mb-2">Your response</label>
            <textarea
              placeholder="Speak from your experience. Just be present."
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
                Responding as <span className="font-medium text-stone-700">{hideUsername ? 'Anonymous' : username}</span>
              </p>
            )}
            <button onClick={() => setHideUsername(!hideUsername)} className="flex items-center gap-2 text-sm text-stone-500">
              <div className={'w-4 h-4 rounded border-2 flex items-center justify-center ' + (hideUsername ? 'border-stone-800 bg-stone-800' : 'border-stone-300')}>
                {hideUsername && <span className="text-white text-xs">✓</span>}
              </div>
              Hide my username for this response
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
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 bg-stone-800 text-white py-3 rounded-xl text-sm font-medium hover:bg-stone-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Yes, send it'}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={handleAddVoice} className="w-full bg-stone-800 text-white py-4 px-6 rounded-2xl text-base font-medium hover:bg-stone-700 transition-colors mt-4">
              Add your voice
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
