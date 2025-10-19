import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combine class names with Tailwind CSS conflict resolution
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a random ID
 */
export function generateId(prefix: string = ''): string {
  const id = Math.random().toString(36).substr(2, 9);
  return prefix ? `${prefix}_${id}` : id;
}
