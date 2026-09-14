import { Context, SessionFlavor } from 'grammy';
import { Role } from '@prisma/client';
export type SessionStep = 'IDLE'|'SEARCH_COURSE'|'ADD_COURSE_TITLE'|'ADD_COURSE_INSTRUCTOR'|'ADD_COURSE_SEMESTER'|'ADD_COURSE_LINK'|'ADD_COURSE_CONFIRM_DUPLICATE'|'SUGGEST_TITLE'|'SUGGEST_INSTRUCTOR'|'SUGGEST_SEMESTER'|'SUGGEST_LINK'|'REJECT_REASON_WAIT'|'ADMIN_SEARCH_COURSE'|'ADMIN_DELETE_COURSE'|'ADMIN_CONFIRM_DELETE_COURSE'|'ADMIN_SEARCH_USER'|'ADMIN_ADD_SUPERVISOR'|'ADMIN_MODERATION'|'ADMIN_MODERATION_REASON';
export interface SessionData { step?: SessionStep; pendingCourse?: {title?:string;instructor?:string;semester?:string;link?:string}; pendingRejection?:{suggestionId:string}; pendingModeration?:{userId:bigint; action:'BAN'|'RESTRICT'; durationMinutes?:number}; }
export interface CustomContextProps { userRole:Role; dbUser:{id:bigint;firstName:string;lastName:string|null;username:string|null;role:Role}; }
export type CustomContext = Context & SessionFlavor<SessionData> & CustomContextProps;
