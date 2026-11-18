// "Trail Mix" -> "TM", "Tennis Bag" -> "TB" (used for photo placeholders)
export function productInitials(name: string): string {
  return name
    .split(' ')
    .filter((word) => /^[A-Za-z]/.test(word))
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}
