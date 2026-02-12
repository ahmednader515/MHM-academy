-- AlterTable
-- First, add the new column as TEXT[] (array)
ALTER TABLE "HomeworkSubmission" ADD COLUMN "correctedImageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Migrate existing data: if correctedImageUrl exists, add it to the array
UPDATE "HomeworkSubmission"
SET "correctedImageUrls" = ARRAY["correctedImageUrl"]::TEXT[]
WHERE "correctedImageUrl" IS NOT NULL;

-- Drop the old column
ALTER TABLE "HomeworkSubmission" DROP COLUMN "correctedImageUrl";

