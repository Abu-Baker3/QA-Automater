/** Merge class names (placeholder for tailwind-merge in later stories). */
export function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
