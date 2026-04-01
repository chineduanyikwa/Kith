'use client'

import { useState, Suspense, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function RespondForm() {
  const searchParams = useSearchParams()
  const postId = searchParams.get('post_id') || ''
  const category = searchParams.get('category') || ''

  const [post, setPost] = useState<{ content: string; anonymous: boolean } | null>(null)
  const [content, setContent] = useState('')
  const [anonymous, setAnonymous] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const MIN_LENGTH = 15
  const MAX_LENGTH = 1500

  useEffect(() => {
    async function loadPost() {
      const { data } = await supabase
        .from('posts')
        .select('content, anonymous')
        .eq('id', postId)
        .single()
      if (data) setPost(data)
    }
    if (postId) loadPost()
  }, [postId])

  const validate = () => {
    if (content.trim().length < MIN_LENGTH) {
      return `Please share a little more — at least ${MIN_LENGTH} characters.`
    }
    if (content.trim().length > MAX_LENGTH) {
      return `Please keep your response under ${MAX_LENGTH} characters.`
    }
    return null
  }

  async function handleSubmit() {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError('')

    const { error } = await supabase.from('responses').insert({
      content: content.trim(),
      post_id: parseInt(postId),
      anonymous,
    })

    if (error) {
      console.error(error)
      setLoading(false)
    } else {
      router.push(`/browse/${category}/${postId}`)
    }
  }

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-10">
      <div className="max-w-xl mx-auto">

        <div className="mb-6">
          <a
            href={`/browse/${category}/${postId}`}
            className="text-sm text-stone-400 hover:text-stone-600"
          >
            Back to Post
          </a>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl px-6 py-6 mb-6">
          <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-3">
            You are responding to
          </p>
          <p className="text-stone-700 text-sm leading-relaxed">
            {post ? post.content : 'Loading...'}
          </p>
          <p className="text-stone-400 text-xs mt-3">
            {post ? (post.anonymous ? 'A member of Kith' : '') : ''}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-stone-400 block mb-2">
              Your response
            </label>
            <textarea
              placeholder="Speak from your experience. You don't have to fix anything. Just be present."
              rows={6}
              value={content}
              onChange={(e) => {
                setContent(e.target.value)
                if (error) setError('')
              }}
              className="w-full bg-white border border-stone-200 rounded-2xl px-5 py-4 text-stone-700 text-sm focus:outline-none focus:border-stone-400 resize-none"
            />
            <div className="flex justify-between mt-1">
              {error ? (
                <p className="text-sm text-red-500">{error}</p>
              ) : (
                <span />
              )}
              <p className="text-xs text-stone-400 ml-auto">
                {content.length}/{MAX_LENGTH}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={() => setAnonymous(false)}
              className="flex items-center gap-2 text-sm text-stone-500"
            >
              <div className={`w-5 h-5 rounded-full border-2 ${!anonymous ? 'border-stone-800 bg-stone-800' : 'border-stone-300'}`}></div>
              Respond as yourself
            </button>
            <button
              onClick={() => setAnonymous(true)}
              className="flex items-center gap-2 text-sm text-stone-500"
            >
              <div className={`w-5 h-5 rounded-full border-2 ${anonymous ? 'border-stone-800 bg-stone-800' : 'border-stone-300'}`}></div>
              Respond anonymously
            </button>
          </div>

          <div className="bg-stone-100 rounded-2xl px-5 py-4 mt-2">
            <p className="text-xs text-stone-400 leading-relaxed">
              Your job is not to fix. Your job is to be present. If you don't have something genuinely useful to offer, it is okay to simply say — I see you.
            </p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-stone-800 text-white py-4 px-6 rounded-2xl text-base font-medium hover:bg-stone-700 transition-colors mt-4 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Add your voice'}
          </button>
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
