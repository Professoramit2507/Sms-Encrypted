/**
 * Shared validators. Return an error string or an empty string when valid.
 */

export function validateEmail(value) {
  if (!value?.trim()) return 'Email is required.';
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  return ok ? '' : 'Enter a valid email address.';
}

export function validateUsername(value) {
  if (!value?.trim()) return 'Username is required.';
  if (value.trim().length < 3) return 'Username must be at least 3 characters.';
  if (!/^[a-zA-Z0-9._-]+$/.test(value.trim())) {
    return 'Username can only include letters, numbers, dots, underscores, and hyphens.';
  }
  return '';
}

export function validateName(value) {
  if (!value?.trim()) return 'Full name is required.';
  if (value.trim().length < 2) return 'Enter your full name.';
  return '';
}

export function validatePassword(value) {
  if (!value) return 'Password is required.';
  if (value.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) {
    return 'Password must include letters and numbers.';
  }
  return '';
}

export function validateConfirmPassword(password, confirm) {
  if (!confirm) return 'Please confirm your password.';
  if (password !== confirm) return 'Passwords do not match.';
  return '';
}

export function validateMessage(value) {
  if (!value?.trim()) return 'Message cannot be empty.';
  if (value.length > 4000) return 'Message is too long.';
  return '';
}

export function validateIdentifier(value) {
  if (!value?.trim()) return 'Email or username is required.';
  return '';
}

export function firstError(errors) {
  return Object.values(errors).find(Boolean) || '';
}
