/**
 * Formatters and string sanitizers for EduShare frontend.
 */

/**
 * Strips redundant leading quantity declarations from item titles.
 * Examples:
 *   "5 Adet Optik Biyoloji ve Laboratuvar Mikroskobu" -> "Optik Biyoloji ve Laboratuvar Mikroskobu"
 *   "12 Adet HP ProDesk i5 Masaüstü Bilgisayar"        -> "HP ProDesk i5 Masaüstü Bilgisayar"
 *   "3x Biyoloji Dersi İçin Mikroskop"                 -> "Biyoloji Dersi İçin Mikroskop"
 *
 * This ensures that when paired with quantity badges like (1 Items) or (1 Adet),
 * conflicting titles like "5 Adet Mikroskop (1 Items)" are avoided.
 */
export const cleanItemTitle = (rawTitle) => {
  if (!rawTitle || typeof rawTitle !== 'string') return '';
  const cleaned = rawTitle.replace(/^\s*\d+\s*(x|adet|tane|items?|pieces?|ad\.)\s*/i, '').trim();
  return cleaned || rawTitle;
};
