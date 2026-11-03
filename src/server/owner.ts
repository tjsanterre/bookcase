/** What a Provider asserts about the person signing in. */
export interface ProviderProfile {
  email?: string | null;
  emailVerified?: boolean | null;
}

/** The Owner is whoever a Provider vouches for with a verified email on the allowlist. */
export function isOwner(ownerEmails: readonly string[], { email, emailVerified }: ProviderProfile): boolean {
  return emailVerified === true && !!email && ownerEmails.includes(email.trim().toLowerCase());
}
