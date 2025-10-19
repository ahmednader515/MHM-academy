/*
  Warnings:

  - You are about to drop the column `parentPhoneNumber` on the `User` table. All the data in the column will be lost.
  - Added the required column `parentEmail` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `User` DROP COLUMN `parentPhoneNumber`,
    ADD COLUMN `college` VARCHAR(191) NULL,
    ADD COLUMN `faculty` VARCHAR(191) NULL,
    ADD COLUMN `level` VARCHAR(191) NULL,
    ADD COLUMN `parentEmail` VARCHAR(191) NOT NULL;

-- CreateTable
CREATE TABLE `ChapterAttachment` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `url` TEXT NOT NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `chapterId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ChapterAttachment_chapterId_idx`(`chapterId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ChapterAttachment` ADD CONSTRAINT `ChapterAttachment_chapterId_fkey` FOREIGN KEY (`chapterId`) REFERENCES `Chapter`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
