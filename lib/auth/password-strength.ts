// Lightweight password-strength estimator for the UI meter. Deliberately dependency-free (no
// zxcvbn) — scores length + character variety and penalises obvious weak patterns. Server-side
// policy (passwordPolicyError) is the real gate; this only guides the user.

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4
  label: string
}

const LABELS = ['Sangat lemah', 'Lemah', 'Cukup', 'Kuat', 'Sangat kuat'] as const

const WEAK_PATTERN =
  /^(?:(.)\1+|0?1?2?3?4?5?6?7?8?9?|password\d*|admin\d*|qwerty\d*|rahasia\d*)$/i

export function scorePassword(password: string): PasswordStrength {
  if (!password) return { score: 0, label: '—' }

  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++

  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length
  if (classes >= 3) score++
  if (classes === 4) score++

  // A password that fails the minimum length, or is an obvious pattern, is weak no matter what.
  if (password.length < 8 || WEAK_PATTERN.test(password)) score = 1

  const clamped = Math.max(0, Math.min(4, score)) as PasswordStrength['score']
  return { score: clamped, label: LABELS[clamped] }
}
