import { LinkRequestStatus } from '@prisma/client';
import { prisma } from '../database/prisma.js';
import { normalizePersianText } from '../utils/text-normalizer.js';

const MAX_ACTIVE_REQUESTS_PER_USER = 5;

export class LinkRequestService {
  static async getActiveCountForUser(userId: bigint): Promise<number> {
    return prisma.linkRequestUser.count({
      where: { userId, request: { status: LinkRequestStatus.ACTIVE } }
    });
  }

  static async createOrJoin(data: {
    userId: bigint;
    courseId: string;
    instructor: string;
    semester: string;
  }) {
    const instructor = data.instructor.trim();
    const semester = data.semester.trim();
    const normalizedInstructor = normalizePersianText(instructor);
    const normalizedSemester = normalizePersianText(semester);

    const activeCount = await this.getActiveCountForUser(data.userId);
    const existing = await prisma.linkRequest.findFirst({
      where: {
        courseId: data.courseId,
        normalizedInstructor,
        normalizedSemester,
        status: LinkRequestStatus.ACTIVE
      }
    });

    if (existing) {
      const already = await prisma.linkRequestUser.findUnique({
        where: { requestId_userId: { requestId: existing.id, userId: data.userId } }
      });
      if (already) { const requesterCount = await prisma.linkRequestUser.count({ where: { requestId: existing.id } }); return { request: existing, joined: false, created: false, activeCount, requesterCount }; }
    }

    if (activeCount >= MAX_ACTIVE_REQUESTS_PER_USER) {
      throw new Error('MAX_ACTIVE_REQUESTS');
    }

    const request = existing ?? await prisma.linkRequest.create({
      data: {
        courseId: data.courseId,
        instructor,
        normalizedInstructor,
        semester,
        normalizedSemester
      }
    });

    await prisma.linkRequestUser.create({
      data: { requestId: request.id, userId: data.userId }
    });

    const count = await prisma.linkRequestUser.count({ where: { requestId: request.id } });
    return { request, joined: true, created: !existing, requesterCount: count, activeCount: activeCount + 1 };
  }

  static async cancelForUser(requestId: string, userId: bigint) {
    const membership = await prisma.linkRequestUser.findUnique({
      where: { requestId_userId: { requestId, userId } },
      include: { request: true }
    });
    if (!membership || membership.request.status !== LinkRequestStatus.ACTIVE) return false;
    await prisma.linkRequestUser.delete({ where: { id: membership.id } });
    const remaining = await prisma.linkRequestUser.count({ where: { requestId, request: { status: LinkRequestStatus.ACTIVE } } });
    if (!remaining) await prisma.linkRequest.update({ where: { id: requestId }, data: { status: LinkRequestStatus.CANCELLED } });
    return true;
  }

  static async getById(id: string) {
    return prisma.linkRequest.findUnique({
      where: { id },
      include: { course: true, requesters: { include: { user: true } } }
    });
  }

  static async getActiveForUser(userId: bigint) {
    return prisma.linkRequestUser.findMany({
      where: { userId, request: { status: LinkRequestStatus.ACTIVE } },
      include: { request: { include: { course: true } } },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async fulfillForResource(data: { courseId: string; instructor?: string | null; semester: string }) {
    const normalizedInstructor = normalizePersianText(data.instructor ?? '');
    const normalizedSemester = normalizePersianText(data.semester);
    const request = await prisma.linkRequest.findFirst({
      where: {
        courseId: data.courseId,
        normalizedInstructor,
        normalizedSemester,
        status: LinkRequestStatus.ACTIVE
      },
      include: { requesters: true, course: true }
    });
    if (!request) return null;
    await prisma.linkRequest.update({ where: { id: request.id }, data: { status: LinkRequestStatus.FULFILLED, fulfilledAt: new Date() } });
    return request;
  }

  static async setChannelMessageId(id: string, messageId: number) {
    return prisma.linkRequest.update({ where: { id }, data: { channelMessageId: messageId } });
  }

  static async countForSemester(normalizedSemester: string): Promise<number> {
    return prisma.linkRequest.count({ where: { normalizedSemester } });
  }

  static async deleteBySemester(normalizedSemester: string): Promise<number> {
    const result = await prisma.linkRequest.deleteMany({ where: { normalizedSemester } });
    return result.count;
  }
}
