export function isSuperAdmin(email: string): boolean {
  const admins = (process.env.SUPER_ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.toLowerCase());
}
