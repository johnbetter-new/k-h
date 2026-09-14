import { distance } from 'fastest-levenshtein';
import { normalizePersianText } from './text-normalizer.js';

export interface CourseMatchTarget {
  id: string;
  title: string;
  instructor: string;
  semester: string;
  normalizedTitle: string;
  normalizedInstructor: string;
  normalizedSemester: string;
}

export interface MatchResult {
  isDuplicate: boolean;
  confidence: number; // 0 to 1
  matchedCourse?: CourseMatchTarget;
  reason?: string;
}

/**
 * Intelligent instructor matching logic supporting full-name and surname cross-matching.
 */
export function matchesInstructor(inputInstructor: string, existingInstructor: string): boolean {
  const normInput = normalizePersianText(inputInstructor);
  const normExisting = normalizePersianText(existingInstructor);

  if (normInput === normExisting) return true;

  const inputTokens = normInput.split(' ').filter(Boolean);
  const existingTokens = normExisting.split(' ').filter(Boolean);

  // Surname match check (e.g. "Ahmadi" matching "Ali Ahmadi")
  const isInputSubtoken = inputTokens.every((token) => existingTokens.includes(token));
  const isExistingSubtoken = existingTokens.every((token) => inputTokens.includes(token));

  if (isInputSubtoken || isExistingSubtoken) return true;

  // Fuzzy match tolerance for small typos
  const levDist = distance(normInput, normExisting);
  const maxLength = Math.max(normInput.length, normExisting.length);
  const similarity = 1 - levDist / maxLength;

  return similarity >= 0.85;
}

/**
 * Multi-criteria duplicate course detector.
 */
export function detectCourseDuplicate(
  input: { title: string; instructor: string; semester: string },
  existingCourses: CourseMatchTarget[]
): MatchResult {
  const normTitle = normalizePersianText(input.title);
  const normSemester = normalizePersianText(input.semester);

  for (const course of existingCourses) {
    const titleSame = course.normalizedTitle === normTitle;
    const instructorMatch = matchesInstructor(input.instructor, course.instructor);
    const semesterSame = course.normalizedSemester === normSemester;

    if (titleSame && instructorMatch && semesterSame) {
      return {
        isDuplicate: true,
        confidence: 1.0,
        matchedCourse: course,
        reason: 'دقیقاً مطابق با عنوان، استاد و نیم‌سال موجود است.',
      };
    }

    // High fuzzy title similarity with instructor match
    const titleDist = distance(normTitle, course.normalizedTitle);
    const maxTitleLen = Math.max(normTitle.length, course.normalizedTitle.length);
    const titleSimilarity = 1 - titleDist / maxTitleLen;

    if (titleSimilarity >= 0.8 && instructorMatch) {
      return {
        isDuplicate: true,
        confidence: titleSimilarity,
        matchedCourse: course,
        reason: `شباهت بالای عنوان (${Math.round(titleSimilarity * 100)}%) و تطابق استاد.`,
      };
    }
  }

  return { isDuplicate: false, confidence: 0 };
}
