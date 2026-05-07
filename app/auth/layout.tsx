import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign in — Kith',
  description: 'Join Kith. A peer support community for real people carrying real weight.',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children
}
