// List of common disposable/temporary email providers
const DISPOSABLE_EMAIL_DOMAINS = [
  // Temporary email services
  "tempmail.com",
  "10minutemail.com",
  "throwaway.email",
  "guerrillamail.com",
  "mailinator.com",
  "sharklasers.com",
  "spam4.me",
  "temp-mail.org",
  "yopmail.com",
  "maildrop.cc",
  "trashmail.com",
  "fakeinbox.com",
  "temp-mailbox.com",
  "emailondeck.com",
  "guerrillamail.info",
  "grr.la",
  "pokemail.net",
  "spam.la",
  "testing.com",
  "throwawaymail.com",
  "temp.email",
  "none.com",
  "dispostable.com",
  "mailnesia.com",
  "tempmail.ninja",
  "mytrashmail.com",
  "minutemail.com",
  "temp-mail.ru",
  "mailbox.in",
  "tempmailer.com",
];

/**
 * Check if email is valid format
 */
export const isValidEmailFormat = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Check if email domain is disposable/temporary
 */
export const isDisposableEmail = (email: string): boolean => {
  const domain = email.toLowerCase().split("@")[1];
  return DISPOSABLE_EMAIL_DOMAINS.includes(domain);
};

/**
 * Validate email - checks format and if it's not disposable
 */
export const validateEmail = (
  email: string,
): { valid: boolean; error?: string } => {
  if (!email) {
    return { valid: false, error: "Email is required" };
  }

  if (!isValidEmailFormat(email)) {
    return { valid: false, error: "Invalid email format" };
  }

  if (isDisposableEmail(email)) {
    return {
      valid: false,
      error:
        "Disposable email addresses are not allowed. Please use a real email.",
    };
  }

  return { valid: true };
};
