-- Course catalog migration. Existing Course rows are preserved as catalog entries and their old links become CourseResource rows.
ALTER TABLE "courses" ADD COLUMN "code" TEXT;
ALTER TABLE "courses" ADD COLUMN "normalizedCode" TEXT;
ALTER TABLE "courses" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "course_aliases" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "alias" TEXT NOT NULL,
  "normalizedAlias" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "course_aliases_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "course_aliases_courseId_normalizedAlias_key" ON "course_aliases"("courseId","normalizedAlias");
CREATE INDEX "course_aliases_normalizedAlias_idx" ON "course_aliases"("normalizedAlias");

CREATE TABLE "course_resources" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "title" TEXT,
  "link" TEXT NOT NULL,
  "instructor" TEXT,
  "normalizedInstructor" TEXT,
  "semester" TEXT,
  "normalizedSemester" TEXT,
  "description" TEXT,
  "submittedById" BIGINT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "course_resources_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "course_resources_courseId_idx" ON "course_resources"("courseId");
CREATE INDEX "course_resources_normalizedInstructor_idx" ON "course_resources"("normalizedInstructor");
CREATE INDEX "course_resources_normalizedSemester_idx" ON "course_resources"("normalizedSemester");

ALTER TABLE "suggestions" ADD COLUMN "courseId" TEXT;

-- Move every legacy Course link into the new resource table.
INSERT INTO "course_resources" ("id","courseId","link","instructor","normalizedInstructor","semester","normalizedSemester","description","submittedById","createdAt","updatedAt")
SELECT md5(random()::text || clock_timestamp()::text || c.id), c.id, c.link, c.instructor, c."normalizedInstructor", c.semester, c."normalizedSemester", c.description, c."createdById", c."createdAt", c."updatedAt"
FROM "courses" c;

-- Link existing suggestions to the best exact legacy course where possible.
UPDATE "suggestions" s SET "courseId" = c.id
FROM "courses" c
WHERE s."normalizedTitle" = c."normalizedTitle"
  AND s."normalizedInstructor" = c."normalizedInstructor"
  AND s."normalizedSemester" = c."normalizedSemester";

ALTER TABLE "course_aliases" ADD CONSTRAINT "course_aliases_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "course_resources" ADD CONSTRAINT "course_resources_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "course_resources" ADD CONSTRAINT "course_resources_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Legacy columns are no longer the source of truth.
ALTER TABLE "courses" DROP COLUMN "instructor";
ALTER TABLE "courses" DROP COLUMN "normalizedInstructor";
ALTER TABLE "courses" DROP COLUMN "semester";
ALTER TABLE "courses" DROP COLUMN "normalizedSemester";
ALTER TABLE "courses" DROP COLUMN "link";
