'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const REPORT_REASONS = [
  { value: 'harmful_advice', label: 'Harmful advice' },
  { value: 'judgment_shaming', label: 'Judgment or shaming' },
  { value: 'abuse_insults', label: 'Abuse or insults' },
  { value: 'sexual_inappropriate', label: 'Sexual or inappropriate content' },
  { value: 'manipulative', label: 'Manipulative behavior' },
  { value: 'spam', label: 'Spam or irrelevant' },
  { value: 'other', label: 'Something else' },
]

function ReportForm() {
  const searchParams = useSearchParams()
  const targetType = searchParams.get('target_type') || ''
  const targetId = searchParams.get('target_id') || ''

  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit() {
    if (!reason) {
      setError('Please select a reason before submitting.')
      return
    }

    setLoading(true)
    setError('')

    const { error: dbError } = await supabase.from('reports').insert({
      target_type: targetType,
      target_id: parseInt(targetId),
      reason,
      status: 'open',
    })

    if (dbError) {
      console.error(dbError)
      setError('Something went wrong. Please try again.')
      setLoading(false)
    } else {
      setSubmitted(true)
    }
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-stone-50 px-6 py-10">
        <div className="max-w-xl mx-auto">
          <div className="bg-white border border-stone-200 rounded-2xl px-6 py-8 text-center">
            <p className="text-stone-800 font-medium text-base mb-2">Report received</p>
            <p className="text-stone-500 text-sm leading-relaxed">
              Thank you. We&apos;ve received your report and will review it.
            </p>
            <button
              onClick={() => window.history.back()}
              className="mt-6 text-sm text-stone-400 hover:text-stone-600 transition-colors"
            >
              Go back
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-10">
      <div className="max-w-xl mx-auto">
        <div>
          <button
            onClick={() => window.history.back()}
            className="text-sm text-stone-400 hover:text-stone-600 transition-colors"
          >
            Back
          </button>
          <h1 className="text-2xl font-bold text-stone-800 mt-2">Report content</h1>
          <p className="text-stone-500 mt-1 text-sm">
            Help us keep this a safe space. What&apos;s the concern?
          </p>
        </div>

        <div className="space-y-6 mt-6">
          <div>
            <label className="text-sm font-medium text-stone-400 block mb-3">
              Reason for reporting
            </label>
            <div className="space-y-2">
              {REPORT_REASONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setReason(option.value)
                    if (error) setError('')
                  }}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                    reason === option.value
                      ? 'border-stone-800 bg-stone-800 text-white'
                      : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                  }`}
                >
                  <p className="text-sm font-medium">{option.label}</p>
                </button>
              ))}
            </div>
            {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-stone-800 text-white py-4 px-6 rounded-2xl text-base font-medium hover:bg-stone-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit report'}
          </button>
        </div>
      </div>
    </main>
  )
}

export default function Report() {
  return (
    <Suspense>
      <ReportForm />
    </Suspense>
  )
}
