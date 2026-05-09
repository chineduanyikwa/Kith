export const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  grief: 'Grief',
  relationships: 'Relationships',
  family: 'Family',
  'work-career': 'Work & Career',
  loneliness: 'Loneliness',
  identity: 'Identity',
  'mental-health': 'Mental Health',
  finances: 'Finances',
  health: 'Health',
  'everything-else': 'Everything Else',
}

export function categoryDisplayName(slug: string): string {
  const decoded = decodeURIComponent(slug)
  if (CATEGORY_DISPLAY_NAMES[decoded]) return CATEGORY_DISPLAY_NAMES[decoded]
  return decoded.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
}
