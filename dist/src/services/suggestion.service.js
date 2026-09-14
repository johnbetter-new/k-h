"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuggestionService = void 0;
const prisma_js_1 = require("../database/prisma.js");
const text_normalizer_js_1 = require("../utils/text-normalizer.js");
class SuggestionService {
    static async createSuggestion(data) { const courseId = data.courseId ?? null; return prisma_js_1.prisma.suggestion.create({ data: { title: data.title.trim(), normalizedTitle: (0, text_normalizer_js_1.normalizePersianText)(data.title), instructor: data.instructor.trim(), normalizedInstructor: (0, text_normalizer_js_1.normalizePersianText)(data.instructor), semester: data.semester.trim(), normalizedSemester: (0, text_normalizer_js_1.normalizePersianText)(data.semester), link: data.link.trim(), submittedById: data.submittedById, courseId } }); }
    static async approveSuggestion(id, reviewerId) { return prisma_js_1.prisma.$transaction(async (tx) => { const claimed = await tx.suggestion.updateMany({ where: { id, status: 'PENDING' }, data: { status: 'APPROVED', reviewedById: reviewerId } }); if (!claimed.count)
        throw new Error('این پیشنهاد قبلاً بررسی شده است.'); const s = await tx.suggestion.findUniqueOrThrow({ where: { id } }); let courseId = s.courseId; if (!courseId) {
        const c = await tx.course.findFirst({ where: { isActive: true, normalizedTitle: s.normalizedTitle } });
        courseId = c?.id ?? null;
    } if (!courseId) {
        const c = await tx.course.create({ data: { title: s.title, normalizedTitle: s.normalizedTitle, createdById: s.submittedById } });
        courseId = c.id;
    } if (!courseId)
        throw new Error('Course ID could not be resolved.'); await tx.courseResource.create({ data: { courseId, link: s.link, instructor: s.instructor, normalizedInstructor: s.normalizedInstructor, semester: s.semester, normalizedSemester: s.normalizedSemester, submittedById: s.submittedById } }); if (s.courseId !== courseId)
        await tx.suggestion.update({ where: { id }, data: { courseId } }); return { updatedSuggestion: { ...s, courseId }, duplicateMatch: { isDuplicate: false, confidence: 0 } }; }); }
    static async rejectSuggestion(id, reviewerId, reason) { const r = reason.trim(); if (!r)
        throw new Error('دلیل رد الزامی است.'); const u = await prisma_js_1.prisma.suggestion.updateMany({ where: { id, status: 'PENDING' }, data: { status: 'REJECTED', reviewedById: reviewerId, rejectionReason: r } }); if (!u.count)
        throw new Error('این پیشنهاد قبلاً بررسی شده است.'); return prisma_js_1.prisma.suggestion.findUniqueOrThrow({ where: { id } }); }
}
exports.SuggestionService = SuggestionService;
