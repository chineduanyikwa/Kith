// Maps raw Supabase auth error messages to friendlier copy. The raw text
// (e.g. "email rate limit exceeded", "Invalid login credentials") should
// never be shown directly to users.

export type AuthErrorContext = 'login' | 'signup' | 'reset' | 'update' | 'oauth';

export function friendlyAuthError(
  rawMessage: string | undefined | null,
  context: AuthErrorContext = 'login',
): string {
  const lower = (rawMessage ?? '').trim().toLowerCase();

  if (
    lower.includes('rate limit') ||
    lower.includes('too many requests')
  ) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }

  if (lower.includes('network') || lower.includes('failed to fetch')) {
    return 'Could not reach the server. Please check your connection and try again.';
  }

  if (context === 'login') {
    if (
      lower.includes('invalid login credentials') ||
      lower.includes('invalid_credentials') ||
      lower.includes('invalid email or password')
    ) {
      return "That email and password don't match an account. Please check them and try again.";
    }
    if (lower.includes('email not confirmed')) {
      return 'Please confirm your email first. Check your inbox for the link we sent.';
    }
    return 'Could not sign in right now. Please try again in a moment.';
  }

  if (context === 'signup') {
    if (
      lower.includes('already registered') ||
      lower.includes('user already') ||
      lower.includes('already exists')
    ) {
      return 'An account with this email already exists. Try logging in instead.';
    }
    if (lower.includes('weak password') || lower.includes('weak_password')) {
      return 'Please choose a stronger password.';
    }
    if (lower.includes('password') && lower.includes('characters')) {
      return 'Please choose a longer password — at least 6 characters.';
    }
    if (lower.includes('valid password')) {
      return 'Please enter a password.';
    }
    if (lower.includes('email') && (lower.includes('invalid') || lower.includes('valid'))) {
      return 'Please enter a valid email address.';
    }
    return 'Could not create your account. Please try again in a moment.';
  }

  if (context === 'reset') {
    if (lower.includes('email') && (lower.includes('invalid') || lower.includes('valid'))) {
      return 'Please enter a valid email address.';
    }
    return 'Could not send the reset link. Please try again in a moment.';
  }

  if (context === 'update') {
    if (
      lower.includes('different from the old') ||
      lower.includes('same_password') ||
      lower.includes('same password')
    ) {
      return 'Please choose a password different from your current one.';
    }
    if (lower.includes('weak password') || lower.includes('weak_password')) {
      return 'Please choose a stronger password.';
    }
    if (lower.includes('password') && lower.includes('characters')) {
      return 'Please choose a longer password — at least 6 characters.';
    }
    if (
      lower.includes('session') ||
      lower.includes('expired') ||
      lower.includes('jwt') ||
      lower.includes('token')
    ) {
      return 'Your reset link has expired. Please request a new one.';
    }
    return 'Could not update your password. Please try again in a moment.';
  }

  // oauth
  return 'Could not continue with Google right now. Please try again in a moment.';
}
