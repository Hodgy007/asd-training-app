import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Join class names and let later Tailwind utilities override earlier ones
 * (`cn('max-w-md', 'max-w-sm')` → `'max-w-sm'`). Used by the copy-in UI
 * primitives so call sites can override their default styling; plain `clsx`
 * leaves both classes in place and the stylesheet order decides.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
