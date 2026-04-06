/**
 * Robust normalization for country names to handle variants in 
 * diacritics, punctuation, and common abbreviations.
 */
export const normalizeCountryName = (name: string): string => {
  if (!name) return "";
  
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics (é -> e)
    .toLowerCase()
    .replace(/\bst\.?\b/g, "saint") // "St." or "St" -> "saint"
    .replace(/[^a-z0-9]/g, " ")     // replace all non-alphanumeric with spaces (handles hyphens, dots, etc.)
    .replace(/\s+/g, " ")           // collapse multiple spaces
    .trim();
};
