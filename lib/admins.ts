/**
 * Accounts that are always admins, matched by sign-in email.
 * Keep in sync with isAdmin() in firestore.rules and storage.rules.
 * Anyone else can still be promoted by setting users/{uid}.role = "admin".
 */
export const adminEmails = ["admin@cs-masterclass.com"];

export const isAdminEmail = (email: string | null | undefined) => Boolean(email) && adminEmails.includes(email!.toLowerCase());
