import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind class names, resolving conflicts so a later class wins.
 *
 * Lives outside the `'use client'` UI module so Server Components can use it
 * too — a client-module export cannot be called from the server.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
