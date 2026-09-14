import { describe, it, expect } from 'vitest';
import { normalizePersianText, isValidUrl } from '../src/utils/text-normalizer.js';

describe('Persian Text Normalizer Utility', () => {
  it('converts Arabic/Persian numbers to English', () => {
    expect(normalizePersianText('نیمسال ۱۴۰۲')).toBe('نیمسال 1402');
  });

  it('unifies Persian YEH/KAF variations and diacritics', () => {
    expect(normalizePersianText('كلاس فِیزيك')).toBe('کلاس فیزیک');
  });

  it('validates HTTP/HTTPS links properly', () => {
    expect(isValidUrl('https://t.me/kiau_course')).toBe(true);
    expect(isValidUrl('http://iau-karaj.ac.ir')).toBe(true);
    expect(isValidUrl('invalid-link')).toBe(false);
  });
});
