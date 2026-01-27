// Sillon platform admin emails
export const SILLON_ADMIN_EMAILS = [
  'mickael.thomas@pm.me',
  'mickael@oolala.ae'
];

export function isSillonAdmin(email: string | undefined | null): boolean {
  return !!email && SILLON_ADMIN_EMAILS.includes(email.toLowerCase());
}
