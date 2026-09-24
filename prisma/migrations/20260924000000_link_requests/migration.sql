CREATE TYPE "LinkRequestStatus" AS ENUM ('ACTIVE', 'FULFILLED', 'CANCELLED');

CREATE TABLE "link_requests" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "normalizedInstructor" TEXT NOT NULL,
  "instructor" TEXT NOT NULL,
  "normalizedSemester" TEXT NOT NULL,
  "semester" TEXT NOT NULL,
  "status" "LinkRequestStatus" NOT NULL DEFAULT 'ACTIVE',
  "channelMessageId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fulfilledAt" TIMESTAMP(3),
  CONSTRAINT "link_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "link_requests_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "link_request_users" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "userId" BIGINT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notifiedAt" TIMESTAMP(3),
  CONSTRAINT "link_request_users_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "link_request_users_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "link_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "link_request_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "link_request_users_requestId_userId_key" ON "link_request_users"("requestId", "userId");
CREATE INDEX "link_requests_courseId_normalizedInstructor_normalizedSemester_idx" ON "link_requests"("courseId", "normalizedInstructor", "normalizedSemester");
CREATE INDEX "link_requests_status_idx" ON "link_requests"("status");
CREATE INDEX "link_requests_normalizedSemester_idx" ON "link_requests"("normalizedSemester");
CREATE INDEX "link_request_users_userId_idx" ON "link_request_users"("userId");
