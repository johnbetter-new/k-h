import { Course } from '@prisma/client';
import { prisma } from '../database/prisma.js';
import { normalizePersianText } from '../utils/text-normalizer.js';
import { detectCourseDuplicate, MatchResult } from '../utils/duplicate-detector.js';

export class CourseService {
  static async createCourse(data: {
    title: string;
    instructor: string;
    semester: string;
    link: string;
    createdById: bigint;
  }): Promise<Course> {
    return prisma.course.create({
      data: {
        title: data.title.trim(),
        normalizedTitle: normalizePersianText(data.title),
        instructor: data.instructor.trim(),
        normalizedInstructor: normalizePersianText(data.instructor),
        semester: data.semester.trim(),
        normalizedSemester: normalizePersianText(data.semester),
        link: data.link.trim(),
        createdById: data.createdById,
      },
    });
  }

  static async searchCourses(query: string): Promise<Course[]> {
    const normalized = normalizePersianText(query);
    if (!normalized) return [];

    return prisma.course.findMany({
      where: {
        OR: [
          { normalizedTitle: { contains: normalized } },
          { normalizedInstructor: { contains: normalized } },
          { normalizedSemester: { contains: normalized } },
        ],
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
    });
  }

  static async checkDuplicate(input: {
    title: string;
    instructor: string;
    semester: string;
  }): Promise<MatchResult> {
    const allCourses = await prisma.course.findMany({
      select: {
        id: true,
        title: true,
        instructor: true,
        semester: true,
        normalizedTitle: true,
        normalizedInstructor: true,
        normalizedSemester: true,
      },
    });

    return detectCourseDuplicate(input, allCourses);
  }

  static async getLatestCourses(limit = 10): Promise<Course[]> {
    return prisma.course.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }
}
