/**
 * Comprehensive Persian / Arabic text normalization utility for KIAU Hoosh
 */
export function normalizePersianText(text: string): string {
  if (!text) return '';

  let str = text.trim();

  // 1. Convert Persian and Arabic digits to Standard English Digits
  const faDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  for (let i = 0; i < 10; i++) {
    str = str.replace(new RegExp(faDigits[i]!, 'g'), String(i));
    str = str.replace(new RegExp(arDigits[i]!, 'g'), String(i));
  }

  // 2. Unify Persian and Arabic character variants
  str = str
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/ة/g, 'ه')
    .replace(/أ/g, 'ا')
    .replace(/إ/g, 'ا')
    .replace(/آ/g, 'ا')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ی');

  // 3. Remove Diacritics (Tashkeel, Fatha, Damma, Kasra, Tanween, etc.)
  str = str.replace(/[\u064B-\u065F\u0670]/g, '');

  // 4. Remove Zero-Width Non-Joiner (ZWNJ) and special spaces
  str = str.replace(/[\u200C\u200B\u200D\uFEFF]/g, ' ');

  // 5. Replace non-alphanumeric punctuation with spaces
  str = str.replace(/[^\w\s\u0600-\u06FF]/g, ' ');

  // 6. Convert to lower case (for English text inside course titles)
  str = str.toLowerCase();

  // 7. Collapse multiple spaces into a single space
  str = str.replace(/\s+/g, ' ').trim();

  return str;
}

export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
