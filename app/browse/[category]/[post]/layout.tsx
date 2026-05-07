import type { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>
}): Promise<Metadata> {
  const { category } = await params
  const decoded = decodeURIComponent(category).replace(/-/g, ' ')
  const capitalised = decoded.replace(/\b\w/g, (l) => l.toUpperCase())
  return {
    title: `A post in ${capitalised} — Kith`,
    description: `Someone shared something in the ${decoded} circle on Kith. Real people, real weight.`,
  }
}

export default function PostLayout({ children }: { children: React.ReactNode }) {
  return children
}
