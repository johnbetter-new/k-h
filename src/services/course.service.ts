import { Course } from '@prisma/client';
import { prisma } from '../database/prisma.js';
import { normalizePersianText } from '../utils/text-normalizer.js';
import { distance } from 'fastest-levenshtein';

export type CourseCandidate = Course & { score: number; matchedBy: 'title' | 'alias' | 'code' };
export type CourseResolution = { kind: 'EXACT' | 'AMBIGUOUS' | 'NONE'; course?: Course; candidates: CourseCandidate[] };

const score = (a: string, b: string) => { const x = normalizePersianText(a), y = normalizePersianText(b); if (!x || !y) return 0; if (x === y) return 1; if (x.includes(y) || y.includes(x)) return Math.min(x.length, y.length) / Math.max(x.length, y.length) * .98; return 1 - distance(x, y) / Math.max(x.length, y.length); };

export class CourseService {
  static async createCatalogCourse(data: { title: string; code?: string; description?: string; createdById: bigint; }): Promise<Course> {
    return prisma.course.create({ data: { title: data.title.trim(), normalizedTitle: normalizePersianText(data.title), code: data.code?.trim() || null, normalizedCode: data.code ? normalizePersianText(data.code) : null, description: data.description?.trim() || null, createdById: data.createdById } });
  }

  static async createResource(data: { courseId: string; link: string; title?: string; instructor?: string; semester?: string; description?: string; submittedById: bigint; }): Promise<void> {
    await prisma.courseResource.create({ data: { courseId: data.courseId, link: data.link.trim(), title: data.title?.trim(), instructor: data.instructor?.trim(), normalizedInstructor: data.instructor ? normalizePersianText(data.instructor) : null, semester: data.semester?.trim(), normalizedSemester: data.semester ? normalizePersianText(data.semester) : null, description: data.description?.trim(), submittedById: data.submittedById } });
  }

  static async createCourse(data: { title: string; instructor: string; semester: string; link: string; createdById: bigint; code?: string; }): Promise<Course> {
    return prisma.$transaction(async tx => {
      const course = await tx.course.create({ data: { title: data.title.trim(), normalizedTitle: normalizePersianText(data.title), code: data.code?.trim() || null, normalizedCode: data.code ? normalizePersianText(data.code) : null, createdById: data.createdById } });
      await tx.courseResource.create({ data: { courseId: course.id, link: data.link.trim(), instructor: data.instructor.trim(), normalizedInstructor: normalizePersianText(data.instructor), semester: data.semester.trim(), normalizedSemester: normalizePersianText(data.semester), submittedById: data.createdById } });
      return course;
    });
  }

  static async resolveCourse(query: string): Promise<CourseResolution> {
    const n = normalizePersianText(query); if (!n) return { kind: 'NONE', candidates: [] };
    const courses = await prisma.course.findMany({ where: { isActive: true }, include: { aliases: true }, take: 100 });
    const scored: CourseCandidate[] = [];
    for (const c of courses) {
      const titleScore = score(n, c.normalizedTitle);
      let best = titleScore; let by: 'title'|'alias'|'code' = 'title';
      for (const a of c.aliases) { const s = score(n, a.normalizedAlias); if (s > best) { best = s; by = 'alias'; } }
      if (c.normalizedCode) { const s = score(n, c.normalizedCode); if (s > best) { best = s; by = 'code'; } }
      if (best >= .62) scored.push({ ...c, score: best, matchedBy: by });
    }
    scored.sort((a,b) => b.score-a.score);
    const candidates = scored.slice(0, 6);
    if (!candidates.length) return { kind: 'NONE', candidates: [] };
    if (candidates[0].score >= .92 && (candidates.length === 1 || candidates[0].score - candidates[1].score >= .08)) return { kind: 'EXACT', course: candidates[0], candidates };
    return { kind: 'AMBIGUOUS', candidates };
  }

  static async searchCourses(query: string): Promise<Course[]> {
    const r = await this.resolveCourse(query);
    return r.candidates.sort((a,b)=>b.score-a.score).map(({ score: _s, matchedBy: _m, ...c }) => c);
  }

  static async findResourceConflict(input: { courseId: string; link: string; instructor?: string; semester?: string; }) {
    const link = input.link.trim(); const ni = input.instructor ? normalizePersianText(input.instructor) : ''; const ns = input.semester ? normalizePersianText(input.semester) : '';
    return prisma.courseResource.findFirst({ where: { courseId: input.courseId, link, ...(ni ? { normalizedInstructor: ni } : {}), ...(ns ? { normalizedSemester: ns } : {}) } });
  }
  static async getSemestersWithResources(): Promise<Array<{ semester: string; normalizedSemester: string; count: number }>> {
    const groups = await prisma.courseResource.groupBy({
      by: ['normalizedSemester'],
      where: { normalizedSemester: { not: null } },
      _count: { _all: true },
      orderBy: { normalizedSemester: 'asc' }
    });
    const result: Array<{ semester: string; normalizedSemester: string; count: number }> = [];
    for (const group of groups) {
      if (!group.normalizedSemester) continue;
      const sample = await prisma.courseResource.findFirst({
        where: { normalizedSemester: group.normalizedSemester, semester: { not: null } },
        select: { semester: true }
      });
      if (!sample?.semester) continue;
      result.push({ semester: sample.semester, normalizedSemester: group.normalizedSemester, count: group._count._all });
    }
    return result;
  }

  static async deleteResourcesBySemester(normalizedSemester: string): Promise<number> {
    const result = await prisma.courseResource.deleteMany({ where: { normalizedSemester } });
    return result.count;
  }
  static async getLatestCourses(limit=10) { return prisma.course.findMany({ where: { isActive: true }, take: limit, orderBy: { createdAt: 'desc' }, include: { resources: { take: 1, orderBy: { createdAt: 'desc' } } } }); }
  static async getCourse(id: string) { return prisma.course.findUnique({ where: { id }, include: { aliases: true, resources: { orderBy: { createdAt: 'desc' } } } }); }
  static async addAlias(courseId: string, alias: string) { return prisma.courseAlias.create({ data: { courseId, alias: alias.trim(), normalizedAlias: normalizePersianText(alias) } }); }
  static async deactivate(id: string) { return prisma.course.update({ where: { id }, data: { isActive: false } }); }
  static async checkDuplicate(input: { title: string; instructor: string; semester: string }) { const r=await this.resolveCourse(input.title); return { isDuplicate: r.kind !== 'NONE', confidence: r.candidates[0]?.score ?? 0, matchedCourse: r.candidates[0], reason: r.kind==='EXACT' ? 'این عنوان با یک درس موجود تطابق قطعی دارد.' : 'یک یا چند درس مشابه پیدا شد.' }; }
}
