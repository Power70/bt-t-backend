/**
 * Utility functions for slug generation
 */

/**
 * Generate a URL-friendly slug from a title
 * @param title - The title to convert to a slug
 * @returns A URL-friendly slug
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Generate a unique slug by appending a timestamp
 * @param title - The title to convert to a slug
 * @returns A unique slug with timestamp
 */
export function generateUniqueSlug(title: string): string {
  const baseSlug = generateSlug(title);
  const timestamp = Date.now();
  return `${baseSlug}-${timestamp}`;
}

/**
 * Generate a slug with a counter suffix
 * @param title - The title to convert to a slug
 * @param counter - The counter to append
 * @returns A slug with counter suffix
 */
export function generateSlugWithCounter(
  title: string,
  counter: number,
): string {
  const baseSlug = generateSlug(title);
  return counter > 0 ? `${baseSlug}-${counter}` : baseSlug;
}
