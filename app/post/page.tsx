'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

function PostForm() {
  const searchParams = useSearchParams()
  const category = searchParams.get('category') || ''
  const categoryDisplay = category
    ? category.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
    : ''

  const [content, setContent] = useState('')
  const [anonymous, setAnonymous] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const MIN_LENGTH = 20
  const MAX_LENGTH = 2000

  const validate = () => {
    if (content.trim().length < MIN_LENGTH) {
      return `Please share a little more — at least ${MIN_LENGTH} characters.`
    }
    if (content.trim().length > MAX_LENGTH) {
      return `Please keep your post under ${MAX_LENGTH} characters.`
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

    const { error } = await supabase.from('posts').insert({
      content: content.trim(),
      category,
      anonymous,
    })

    if (error) {
      console.error(error)
      setLoading(false)
    } else {
      router.push(`/browse/${category}`)
    }
  }

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-10">
      <div className="max-w-xl mx-auto">
        <div>
          <a
            href={`/browse?intent=talk`}
            className="text-sm text-stone-400 hover:text-stone-600"
          >
            Back to Categories
          </a>
          <h1 className="text-2xl font-bold text-stone-800 mt-2">What&apos;s on your heart?</h1>
          {categoryDisplay ? (
            <p className="text-stone-500 mt-1 font-medium text-stone-700">Posting in {categoryDisplay}</p>
          ) : (
            <p className="text-stone-500 mt-1">This is your space. Say it however it comes.</p>
          )}
        </div>

        <div className="space-y-4 mt-6">
          <div>
            <label className="text-sm font-medium text-stone-400 block mb-2">
              Your post
            </label>
            <textarea
              placeholder="Say what you need to say..."
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
              Post as yourself
            </button>
            <button
              onClick={() => setAnonymous(true)}
              className="flex items-center gap-2 text-sm text-stone-500"
            >
              <div className={`w-5 h-5 rounded-full border-2 ${anonymous ? 'border-stone-800 bg-stone-800' : 'border-stone-300'}`}></div>
              Post anonymously
            </button>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-stone-800 text-white py-4 px-6 rounded-2xl text-base font-medium hover:bg-stone-700 transition-colors mt-4 disabled:opacity-50"
          >
            {loading ? 'Posting...' : 'Let it out'}
          </button>
        </div>
      </div>
    </main>
  )
}

export default function NewPost() {
  return (
    <Suspense>
      <PostForm />
    </Suspense>
  )
}
