export const ADMIN_SEARCH_MIN_CHARS = 3;

export function normalizeAdminSearchTerm(input: string, minChars = ADMIN_SEARCH_MIN_CHARS): string {
  const normalized = input.trim();
  return normalized.length >= minChars ? normalized : '';
}

