-- AlterTable
-- Add the new column as TEXT[] (array)
ALTER TABLE "HomeworkSubmission" ADD COLUMN "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Migrate existing data: if imageUrl exists, add it to the array
UPDATE "HomeworkSubmission"
SET "imageUrls" = ARRAY["imageUrl"]::TEXT[]
WHERE "imageUrl" IS NOT NULL AND "imageUrl" != '';

-- Note: We keep the old imageUrl column for backward compatibility

