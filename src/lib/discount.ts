import { customAlphabet } from 'nanoid';

// Exclude confusing characters: 0/O, 1/I/L
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const generateCode = customAlphabet(ALPHABET, 6);

export function createDiscountCode(): string {
  return generateCode();
}

export function isCodeExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}

export function getExpiryDate(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

export type DiscountVerifyResult =
  | { valid: true; discount_value: string; discount_type: string; expires_at: string }
  | { valid: false; reason: 'not_found' | 'already_used' | 'expired' };
