"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CourseService = void 0;
const prisma_js_1 = require("../database/prisma.js");
const text_normalizer_js_1 = require("../utils/text-normalizer.js");
const fastest_levenshtein_1 = require("fastest-levenshtein");
const score = (a, b) => { const x = (0, text_normalizer_js_1.normalizePersianText)(a), y = (0, text_normalizer_js_1.normalizePersianText)(b); if (!x || !y)
    return 0; if (x === y)
    return 1; if (x.includes(y) || y.includes(x))
    return Math.min(x.length, y.length) / Math.max(x.length, y.length) * .98; return 1 - (0, fastest_levenshtein_1.distance)(x, y) / Math.max(x.length, y.length); };
class CourseService {
    static async createCatalogCourse(data) {
        return prisma_js_1.prisma.course.create({ data: { title: data.title.trim(), normalizedTitle: (0, text_normalizer_js_1.normalizePersianText)(data.title), code: data.code?.trim() || null, normalizedCode: data.code ? (0, text_normalizer_js_1.normalizePersianText)(data.code) : null, description: data.description?.trim() || null, createdById: data.createdById } });
    }
    static async createResource(data) {
        await prisma_js_1.prisma.courseResource.create({ data: { courseId: data.courseId, link: data.link.trim(), title: data.title?.trim(), instructor: data.instructor?.trim(), normalizedInstructor: data.instructor ? (0, text_normalizer_js_1.normalizePersianText)(data.instructor) : null, semester: data.semester?.trim(), normalizedSemester: data.semester ? (0, text_normalizer_js_1.normalizePersianText)(data.semester) : null, description: data.description?.trim(), submittedById: data.submittedById } });
    }
    static async createCourse(data) {
        return prisma_js_1.prisma.$transaction(async (tx) => {
            const course = await tx.course.create({ data: { title: data.title.trim(), normalizedTitle: (0, text_normalizer_js_1.normalizePersianText)(data.title), code: data.code?.trim() || null, normalizedCode: data.code ? (0, text_normalizer_js_1.normalizePersianText)(data.code) : null, createdById: data.createdById } });
            await tx.courseResource.create({ data: { courseId: course.id, link: data.link.trim(), instructor: data.instructor.trim(), normalizedInstructor: (0, text_normalizer_js_1.normalizePersianText)(data.instructor), semester: data.semester.trim(), normalizedSemester: (0, text_normalizer_js_1.normalizePersianText)(data.semester), submittedById: data.createdById } });
            return course;
        });
    }
    static async resolveCourse(query) {
        const n = (0, text_normalizer_js_1.normalizePersianText)(query);
        if (!n)
            return { kind: 'NONE', candidates: [] };
        const courses = await prisma_js_1.prisma.course.findMany({ where: { isActive: true }, include: { aliases: true }, take: 100 });
        const scored = [];
        for (const c of courses) {
            const titleScore = score(n, c.normalizedTitle);
            let best = titleScore;
            let by = 'title';
            for (const a of c.aliases) {
                const s = score(n, a.normalizedAlias);
                if (s > best) {
                    best = s;
                    by = 'alias';
                }
            }
            if (c.normalizedCode) {
                const s = score(n, c.normalizedCode);
                if (s > best) {
                    best = s;
                    by = 'code';
                }
            }
            if (best >= .62)
                scored.push({ ...c, score: best, matchedBy: by });
        }
        scored.sort((a, b) => b.score - a.score);
        const candidates = scored.slice(0, 6);
        if (!candidates.length)
            return { kind: 'NONE', candidates: [] };
        if (candidates[0].score >= .92 && (candidates.length === 1 || candidates[0].score - candidates[1].score >= .08))
            return { kind: 'EXACT', course: candidates[0], candidates };
        return { kind: 'AMBIGUOUS', candidates };
    }
    static async searchCourses(query) {
        const r = await this.resolveCourse(query);
        return r.candidates.sort((a, b) => b.score - a.score).map(({ score: _s, matchedBy: _m, ...c }) => c);
    }
    static async findResourceConflict(input) {
        const link = input.link.trim();
        const ni = input.instructor ? (0, text_normalizer_js_1.normalizePersianText)(input.instructor) : '';
        const ns = input.semester ? (0, text_normalizer_js_1.normalizePersianText)(input.semester) : '';
        return prisma_js_1.prisma.courseResource.findFirst({ where: { courseId: input.courseId, link, ...(ni ? { normalizedInstructor: ni } : {}), ...(ns ? { normalizedSemester: ns } : {}) } });
    }
    static async getLatestCourses(limit = 10) { return prisma_js_1.prisma.course.findMany({ where: { isActive: true }, take: limit, orderBy: { createdAt: 'desc' }, include: { resources: { take: 1, orderBy: { createdAt: 'desc' } } } }); }
    static async getCourse(id) { return prisma_js_1.prisma.course.findUnique({ where: { id }, include: { aliases: true, resources: { orderBy: { createdAt: 'desc' } } } }); }
    static async addAlias(courseId, alias) { return prisma_js_1.prisma.courseAlias.create({ data: { courseId, alias: alias.trim(), normalizedAlias: (0, text_normalizer_js_1.normalizePersianText)(alias) } }); }
    static async deactivate(id) { return prisma_js_1.prisma.course.update({ where: { id }, data: { isActive: false } }); }
    static async checkDuplicate(input) { const r = await this.resolveCourse(input.title); return { isDuplicate: r.kind !== 'NONE', confidence: r.candidates[0]?.score ?? 0, matchedCourse: r.candidates[0], reason: r.kind === 'EXACT' ? 'این عنوان با یک درس موجود تطابق قطعی دارد.' : 'یک یا چند درس مشابه پیدا شد.' }; }
}
exports.CourseService = CourseService;
