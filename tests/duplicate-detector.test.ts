import { describe, it, expect } from 'vitest';
import { matchesInstructor, detectCourseDuplicate } from '../src/utils/duplicate-detector.js';

describe('Instructor & Course Duplicate Detector', () => {
  it('matches full-name against surname variations', () => {
    expect(matchesInstructor('احمدی', 'علی احمدی')).toBe(true);
    expect(matchesInstructor('علی احمدی', 'احمدی')).toBe(true);
  });

  it('detects high-confidence duplicate courses', () => {
    const existing = [
      {
        id: '1',
        title: 'ریاضی مهندسی',
        instructor: 'دکتر احمدی',
        semester: '4031',
        normalizedTitle: 'ریاضی مهندسی',
        normalizedInstructor: 'دکتر احمدی',
        normalizedSemester: '4031',
      },
    ];

    const result = detectCourseDuplicate(
      { title: 'ریاضی مهندسی', instructor: 'احمدی', semester: '4031' },
      existing
    );

    expect(result.isDuplicate).toBe(true);
  });
});
