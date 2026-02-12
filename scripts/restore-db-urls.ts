import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

interface DatabaseBackup {
  timestamp: string;
  version: string;
  data: {
    users: Array<{ id: string; image: string | null }>;
    courses: Array<{ id: string; imageUrl: string | null }>;
    attachments: Array<{ id: string; url: string; name: string; courseId: string }>;
    chapters: Array<{ id: string; videoUrl: string | null; documentUrl: string | null }>;
    chapterAttachments: Array<{ id: string; url: string; name: string; chapterId: string }>;
    questions: Array<{ id: string; imageUrl: string | null; quizId: string }>;
    homeworkSubmissions: Array<{ id: string; imageUrl: string; correctedImageUrl: string | null; studentId: string; chapterId: string }>;
    activitySubmissions: Array<{ id: string; imageUrl: string; studentId: string; activityId: string }>;
    certificates: Array<{ id: string; imageUrl: string; studentId: string; assignedBy: string }>;
    timetables: Array<{ id: string; imageUrl: string }>;
    subscriptionRequests: Array<{ id: string; transactionImage: string; subscriptionId: string }>;
  };
}

const BACKUP_DIR = path.join(process.cwd(), "backups");

async function main() {
  console.log("Starting database restore...\n");

  // Get backup file from command line argument or find latest
  const backupFileArg = process.argv[2];
  let backupFile: string;

  if (backupFileArg) {
    backupFile = path.isAbsolute(backupFileArg)
      ? backupFileArg
      : path.join(BACKUP_DIR, backupFileArg);
  } else {
    // Find latest backup file
    if (!fs.existsSync(BACKUP_DIR)) {
      console.error(`Error: Backup directory not found: ${BACKUP_DIR}`);
      console.error("Please specify a backup file or run 'npm run backup-db-urls' first.");
      process.exit(1);
    }

    const files = fs
      .readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith("db-urls-backup-") && f.endsWith(".json"))
      .sort()
      .reverse();

    if (files.length === 0) {
      console.error(`Error: No backup files found in ${BACKUP_DIR}`);
      console.error("Please run 'npm run backup-db-urls' first.");
      process.exit(1);
    }

    backupFile = path.join(BACKUP_DIR, files[0]);
    console.log(`Using latest backup: ${files[0]}\n`);
  }

  if (!fs.existsSync(backupFile)) {
    console.error(`Error: Backup file not found: ${backupFile}`);
    process.exit(1);
  }

  try {
    // Load backup
    console.log(`Loading backup from: ${backupFile}\n`);
    const content = fs.readFileSync(backupFile, "utf-8");
    const backup: DatabaseBackup = JSON.parse(content);

    console.log(`Backup timestamp: ${backup.timestamp}`);
    console.log(`Backup version: ${backup.version}\n`);

    // Confirm restore
    console.log("⚠️  WARNING: This will overwrite current database values!");
    console.log("Press Ctrl+C to cancel, or wait 5 seconds to continue...\n");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    let restoredCount = 0;

    // Restore Users
    console.log("Restoring User.image...");
    for (const user of backup.data.users) {
      await prisma.user.update({
        where: { id: user.id },
        data: { image: user.image },
      });
      restoredCount++;
    }
    console.log(`  Restored ${backup.data.users.length} users\n`);

    // Restore Courses
    console.log("Restoring Course.imageUrl...");
    for (const course of backup.data.courses) {
      await prisma.course.update({
        where: { id: course.id },
        data: { imageUrl: course.imageUrl },
      });
      restoredCount++;
    }
    console.log(`  Restored ${backup.data.courses.length} courses\n`);

    // Restore Attachments
    console.log("Restoring Attachment.url...");
    for (const attachment of backup.data.attachments) {
      await prisma.attachment.update({
        where: { id: attachment.id },
        data: { url: attachment.url },
      });
      restoredCount++;
    }
    console.log(`  Restored ${backup.data.attachments.length} attachments\n`);

    // Restore Chapters
    console.log("Restoring Chapter.videoUrl and documentUrl...");
    for (const chapter of backup.data.chapters) {
      await prisma.chapter.update({
        where: { id: chapter.id },
        data: {
          videoUrl: chapter.videoUrl,
          documentUrl: chapter.documentUrl,
        },
      });
      restoredCount++;
    }
    console.log(`  Restored ${backup.data.chapters.length} chapters\n`);

    // Restore ChapterAttachments
    console.log("Restoring ChapterAttachment.url...");
    for (const attachment of backup.data.chapterAttachments) {
      await prisma.chapterAttachment.update({
        where: { id: attachment.id },
        data: { url: attachment.url },
      });
      restoredCount++;
    }
    console.log(`  Restored ${backup.data.chapterAttachments.length} chapter attachments\n`);

    // Restore Questions
    console.log("Restoring Question.imageUrl...");
    for (const question of backup.data.questions) {
      await prisma.question.update({
        where: { id: question.id },
        data: { imageUrl: question.imageUrl },
      });
      restoredCount++;
    }
    console.log(`  Restored ${backup.data.questions.length} questions\n`);

    // Restore HomeworkSubmissions
    console.log("Restoring HomeworkSubmission.imageUrl and correctedImageUrl...");
    for (const submission of backup.data.homeworkSubmissions) {
      await prisma.homeworkSubmission.update({
        where: { id: submission.id },
        data: {
          imageUrl: submission.imageUrl,
          correctedImageUrl: submission.correctedImageUrl,
        },
      });
      restoredCount++;
    }
    console.log(`  Restored ${backup.data.homeworkSubmissions.length} homework submissions\n`);

    // Restore ActivitySubmissions
    console.log("Restoring ActivitySubmission.imageUrl...");
    for (const submission of backup.data.activitySubmissions) {
      await prisma.activitySubmission.update({
        where: { id: submission.id },
        data: { imageUrl: submission.imageUrl },
      });
      restoredCount++;
    }
    console.log(`  Restored ${backup.data.activitySubmissions.length} activity submissions\n`);

    // Restore Certificates
    console.log("Restoring Certificate.imageUrl...");
    for (const certificate of backup.data.certificates) {
      await prisma.certificate.update({
        where: { id: certificate.id },
        data: { imageUrl: certificate.imageUrl },
      });
      restoredCount++;
    }
    console.log(`  Restored ${backup.data.certificates.length} certificates\n`);

    // Restore Timetables
    console.log("Restoring Timetable.imageUrl...");
    for (const timetable of backup.data.timetables) {
      await prisma.timetable.update({
        where: { id: timetable.id },
        data: { imageUrl: timetable.imageUrl },
      });
      restoredCount++;
    }
    console.log(`  Restored ${backup.data.timetables.length} timetables\n`);

    // Restore SubscriptionRequests
    console.log("Restoring SubscriptionRequest.transactionImage...");
    for (const request of backup.data.subscriptionRequests) {
      await prisma.subscriptionRequest.update({
        where: { id: request.id },
        data: { transactionImage: request.transactionImage },
      });
      restoredCount++;
    }
    console.log(`  Restored ${backup.data.subscriptionRequests.length} subscription requests\n`);

    console.log("\n" + "=".repeat(50));
    console.log("Restore Summary:");
    console.log(`Total records restored: ${restoredCount}`);
    console.log(`Backup file: ${backupFile}`);
    console.log("=".repeat(50));
    console.log("\n✓ Restore completed successfully!");
  } catch (error) {
    console.error("Error during restore:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

