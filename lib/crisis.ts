export const CRISIS_KEYWORDS = [
  'want to die', 'end my life', 'kill myself', 'killing myself',
  'suicide', 'suicidal', 'no reason to live',
  'end it all', 'not worth living', 'better off dead',
];

export const MANI_NUMBER = '08091116264';

export function containsCrisisLanguage(content: string): boolean {
  const lower = content.toLowerCase();
  return CRISIS_KEYWORDS.some((kw) => lower.includes(kw));
}
