import { Context, SessionFlavor } from 'grammy';
import { Role } from '@prisma/client';
export type SessionStep =
  | 'IDLE' | 'SEARCH_COURSE' | 'SEARCH_COURSE_SELECT' | 'SEARCH_INSTRUCTOR_SELECT' | 'SEARCH_INSTRUCTOR_INPUT' | 'SEARCH_SEMESTER_SELECT' | 'SEARCH_SEMESTER_INPUT'
  | 'ADD_COURSE_TITLE' | 'ADD_COURSE_CODE' | 'ADD_COURSE_INSTRUCTOR' | 'ADD_COURSE_SEMESTER' | 'ADD_COURSE_LINK' | 'ADD_COURSE_CONFIRM_DUPLICATE'
  | 'ADD_RESOURCE_LINK' | 'ADD_RESOURCE_COURSE_SEARCH' | 'ADD_RESOURCE_COURSE_SELECT' | 'ADD_RESOURCE_COURSE_CONFIRM' | 'ADD_RESOURCE_INSTRUCTOR' | 'ADD_RESOURCE_SEMESTER' | 'ADD_RESOURCE_CONFIRM' | 'ADD_RESOURCE_CONFLICT_CONFIRM'
  | 'SUGGEST_TITLE' | 'SUGGEST_COURSE_SEARCH' | 'SUGGEST_COURSE_SELECT' | 'SUGGEST_COURSE_CONFIRM' | 'SUGGEST_INSTRUCTOR' | 'SUGGEST_SEMESTER' | 'SUGGEST_LINK' | 'REJECT_REASON_WAIT'
  | 'ADMIN_SEARCH_COURSE' | 'ADMIN_DELETE_COURSE' | 'ADMIN_CONFIRM_DELETE_COURSE' | 'ADMIN_SEARCH_USER' | 'ADMIN_ADD_SUPERVISOR' | 'ADMIN_MODERATION' | 'ADMIN_MODERATION_REASON'
  | 'ADMIN_BROADCAST_SEARCH_USER' | 'ADMIN_BROADCAST_MESSAGE' | 'REQUEST_LINK_INPUT';
export interface SessionData {
  step?: SessionStep;
  pendingCourse?: { title?: string; code?: string; instructor?: string; semester?: string; link?: string };
  pendingResource?: { link?: string; courseId?: string; courseQuery?: string; instructor?: string; semester?: string };
  pendingSuggestion?: { courseId?: string; title?: string; instructor?: string; semester?: string; link?: string };
  pendingCourseCandidates?: string[];
  pendingSearchCourseId?: string;
  pendingSearchInstructors?: Array<{ name: string; normalized: string }>;
  pendingSearchInstructor?: { name: string; normalized: string };
  pendingSearchSemesters?: Array<{ semester: string; normalizedSemester: string }>;
  pendingRejection?: { suggestionId: string };
  pendingModeration?: { userId: bigint; action: 'BAN' | 'RESTRICT'; durationMinutes?: number };
  pendingSemesterDeletion?: { normalizedSemester: string; semester: string; count: number; requestCount: number };
  pendingSemesterDeletionOptions?: Array<{ normalizedSemester: string; semester: string; count: number; requestCount: number }>;
  pendingBroadcast?: { target: 'ALL' | 'SELECTED'; selectedUserIds: bigint[]; searchQuery?: string };
  pendingLinkRequest?: { requestId: string };
  pendingLinkRequestDraft?: { courseId: string; instructor: { name: string; normalized: string }; semester: { semester: string; normalizedSemester: string } };
}
export interface CustomContextProps { userRole: Role; dbUser: { id: bigint; firstName: string; lastName: string | null; username: string | null; role: Role }; }
export type CustomContext = Context & SessionFlavor<SessionData> & CustomContextProps;
