import { Context, SessionFlavor } from 'grammy';
import { Role } from '@prisma/client';

export interface SessionData {
  step?: 'IDLE' | 'ADD_COURSE_TITLE' | 'ADD_COURSE_INSTRUCTOR' | 'ADD_COURSE_SEMESTER' | 'ADD_COURSE_LINK' | 'ADD_COURSE_CONFIRM_DUPLICATE' | 'SUGGEST_TITLE' | 'SUGGEST_INSTRUCTOR' | 'SUGGEST_SEMESTER' | 'SUGGEST_LINK' | 'REJECT_REASON_WAIT';
  pendingCourse?: {
    title?: string;
    instructor?: string;
    semester?: string;
    link?: string;
  };
  pendingRejection?: {
    suggestionId: string;
  };
}

export interface CustomContextProps {
  userRole: Role;
  dbUser: {
    id: bigint;
    firstName: string;
    lastName: string | null;
    username: string | null;
    role: Role;
  };
}

export type CustomContext = Context & SessionFlavor<SessionData> & CustomContextProps;
