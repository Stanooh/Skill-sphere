export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: 'Too Weak' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong';
  isValid: boolean;
  criteria: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
    notEmailOrName: boolean;
    noCommonPattern: boolean;
  };
  recommendations: string[];
}

const COMMON_PATTERNS = [
  'password',
  '123456',
  '12345678',
  'qwerty',
  'skillsphere',
  'admin',
  'mentor',
  'learner',
  'abcdef',
  'letmein',
  'welcome',
];

/**
 * Validate password strength against strict requirements:
 * - Minimum 12 characters
 * - Uppercase letter
 * - Lowercase letter
 * - Number
 * - Special character
 * - Not an obvious variation of user's email or name
 * - Not a common weak password pattern
 */
export function validatePasswordStrength(
  password: string,
  userInputs: { email?: string; name?: string } = {}
): PasswordStrength {
  const minLength = password.length >= 12;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const pwdLower = password.toLowerCase();

  // Check email and name variations
  let notEmailOrName = true;
  if (userInputs.email) {
    const emailPrefix = userInputs.email.split('@')[0]?.toLowerCase();
    if (emailPrefix && emailPrefix.length >= 3 && pwdLower.includes(emailPrefix)) {
      notEmailOrName = false;
    }
  }
  if (userInputs.name) {
    const nameParts = userInputs.name
      .toLowerCase()
      .split(/\s+/)
      .filter((p) => p.length >= 3);
    for (const part of nameParts) {
      if (pwdLower.includes(part)) {
        notEmailOrName = false;
        break;
      }
    }
  }

  // Check common weak patterns
  let noCommonPattern = true;
  for (const pattern of COMMON_PATTERNS) {
    if (pwdLower.includes(pattern)) {
      noCommonPattern = false;
      break;
    }
  }
  // Check sequential characters like 1234, abcd
  if (/(?:0123|1234|2345|3456|4567|5678|6789|7890|abcd|bcde|cdef|defg)/i.test(password)) {
    noCommonPattern = false;
  }

  const criteria = {
    minLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecial,
    notEmailOrName,
    noCommonPattern,
  };

  const recommendations: string[] = [];
  if (!minLength) recommendations.push('Use at least 12 characters.');
  if (!hasUppercase || !hasLowercase) recommendations.push('Mix uppercase and lowercase letters.');
  if (!hasNumber) recommendations.push('Include at least one number.');
  if (!hasSpecial) recommendations.push('Include at least one special character (!@#$%^&*).');
  if (!notEmailOrName) recommendations.push('Avoid using parts of your name or email address.');
  if (!noCommonPattern) recommendations.push('Avoid common words, sequential numbers or predictable patterns.');

  if (recommendations.length > 0) {
    recommendations.push('Consider using a password manager to generate a unique, secure password.');
  }

  const passedRequiredCount =
    (minLength ? 1 : 0) +
    (hasUppercase ? 1 : 0) +
    (hasLowercase ? 1 : 0) +
    (hasNumber ? 1 : 0) +
    (hasSpecial ? 1 : 0) +
    (notEmailOrName ? 1 : 0) +
    (noCommonPattern ? 1 : 0);

  let score: 0 | 1 | 2 | 3 | 4 = 0;
  let label: 'Too Weak' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong' = 'Too Weak';

  if (password.length === 0) {
    score = 0;
    label = 'Too Weak';
  } else if (passedRequiredCount <= 3) {
    score = 1;
    label = 'Weak';
  } else if (passedRequiredCount <= 5) {
    score = 2;
    label = 'Fair';
  } else if (passedRequiredCount === 6) {
    score = 3;
    label = 'Strong';
  } else {
    // All 7 passed and length > 14 gives Very Strong, else Strong
    if (password.length >= 14) {
      score = 4;
      label = 'Very Strong';
    } else {
      score = 3;
      label = 'Strong';
    }
  }

  const isValid =
    minLength &&
    hasUppercase &&
    hasLowercase &&
    hasNumber &&
    hasSpecial &&
    notEmailOrName &&
    noCommonPattern;

  return {
    score,
    label,
    isValid,
    criteria,
    recommendations,
  };
}

/**
 * Standard email format validation with trimming and normalization
 */
export function validateEmailFormat(email: string): { isValid: boolean; normalized: string; error?: string } {
  const trimmed = email.trim();
  if (!trimmed) {
    return { isValid: false, normalized: '', error: 'Please enter a valid email address.' };
  }

  // RFC 5322 compliant simplified regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

  if (!emailRegex.test(trimmed)) {
    return { isValid: false, normalized: trimmed.toLowerCase(), error: 'Please enter an email address in the correct format.' };
  }

  return { isValid: true, normalized: trimmed.toLowerCase() };
}

