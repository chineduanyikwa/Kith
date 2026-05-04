// Maps raw Supabase auth error messages to friendlier copy. The raw text
// (e.g. "email rate limit exceeded") should never be shown directly to users.
export function friendlyAuthError(rawMessage: string | undefined | null): string {
  const raw = (rawMessage ?? '').trim();
  const lower = raw.toLowerCase();

  if (
    lower.includes('email rate limit') ||
    lower.includes('rate limit') ||
    lower.includes('too many requests')
  ) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }

  if (!raw) {
    return 'Something went wrong. Please try again.';
  }
  return raw;
}
