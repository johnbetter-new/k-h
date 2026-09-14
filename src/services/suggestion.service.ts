import { Suggestion, SuggestionStatus } from '@prisma/client';
import { prisma } from '../database/prisma.js';
import { normalizePersianText } from '../utils/text-normalizer.js';
import { CourseService } from './course.service.js';

export class SuggestionService {
  static async createSuggestion(data: {
    title: string;
    instructor: string;
    semester: string;
    link: string;
    submittedById: bigint;
  }): Promise<Suggestion> {
    return prisma.suggestion.create({
      data: {
        title: data.title.trim(),
        normalizedTitle: normalizePersianText(data.title),
        instructor: data.instructor.trim(),
        normalizedInstructor: normalizePersianText(data.instructor),
        semester: data.semester.trim(),
        normalizedSemester: normalizePersianText(data.semester),
        link: data.link.trim(),
        submittedById: data.submittedById,
      },
    });
  }

  static async approveSuggestion(suggestionId: string, reviewerId: bigint) {
    return prisma.$transaction(async (tx) => {
      const suggestion = await tx.suggestion.findUnique({
        where: { id: suggestionId },
      });

      if (!suggestion || suggestion.status !== SuggestionStatus.PENDING) {
        throw new Error('پیشنهاد نامعتبر است یا قبلاً بررسی شده است.');
      }

      const duplicateMatch = await CourseService.checkDuplicate({
        title: suggestion.title,
        instructor: suggestion.instructor,
        semester: suggestion.semester,
      });

      const updatedSuggestion = await tx.suggestion.update({
        where: { id: suggestionId },
        data: {
          status: SuggestionStatus.APPROVED,
          reviewedById: reviewerId,
        },
      });

      const createdCourse = await tx.course.create({
        data: {
          title: suggestion.title,
          normalizedTitle: suggestion.normalizedTitle,
          instructor: suggestion.instructor,
          normalizedInstructor: suggestion.normalizedInstructor,
          semester: suggestion.semester,
          normalizedSemester: suggestion.normalizedSemester,
          link: suggestion.link,
          createdById: reviewerId,
        },
      });

      return { updatedSuggestion, createdCourse, duplicateMatch };
    });
  }

  static async rejectSuggestion(suggestionId: string, reviewerId: bigint, reason: string) {
    return prisma.suggestion.update({
      where: { id: suggestionId },
      data: {
        status: SuggestionStatus.REJECTED,
        reviewedById: reviewerId,
        rejectionReason: reason.trim(),
      },
      include: { submittedBy: true },
    });
  }

  static async getPendingSuggestion(id: string) {
    return prisma.suggestion.findUnique({
      where: { id },
      include: { submittedBy: true },
    });
  }
}
