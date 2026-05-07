import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Your profile — Kith',
  description: 'Manage your Kith identity and see your posts and responses.',
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children
}
