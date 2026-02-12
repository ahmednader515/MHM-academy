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
const BACKUP_FILE = path.join(BACKUP_DIR, `db-urls-backup-${Date.now()}.json`);

async function main() {
  console.log("Starting database backup...\n");

  // Create backups directory if it doesn't exist
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`Created backup directory: ${BACKUP_DIR}\n`);
  }

  try {
    console.log("Backing up User.image...");
    const users = await prisma.user.findMany({
      where: {
        image: { not: null },
      },
      select: {
        id: true,
        image: true,
      },
    });
    console.log(`  Found ${users.length} users with images\n`);

    console.log("Backing up Course.imageUrl...");
    const courses = await prisma.course.findMany({
      where: {
        imageUrl: { not: null },
      },
      select: {
        id: true,
        imageUrl: true,
      },
    });
    console.log(`  Found ${courses.length} courses with images\n`);

    console.log("Backing up Attachment.url...");
    const attachments = await prisma.attachment.findMany({
      select: {
        id: true,
        url: true,
        name: true,
        courseId: true,
      },
    });
    console.log(`  Found ${attachments.length} attachments\n`);

    console.log("Backing up Chapter.videoUrl and documentUrl...");
    const chapters = await prisma.chapter.findMany({
      where: {
        OR: [
          { videoUrl: { not: null } },
          { documentUrl: { not: null } },
        ],
      },
      select: {
        id: true,
        videoUrl: true,
        documentUrl: true,
      },
    });
    console.log(`  Found ${chapters.length} chapters with videos/documents\n`);

    console.log("Backing up ChapterAttachment.url...");
    const chapterAttachments = await prisma.chapterAttachment.findMany({
      select: {
        id: true,
        url: true,
        name: true,
        chapterId: true,
      },
    });
    console.log(`  Found ${chapterAttachments.length} chapter attachments\n`);

    console.log("Backing up Question.imageUrl...");
    const questions = await prisma.question.findMany({
      where: {
        imageUrl: { not: null },
      },
      select: {
        id: true,
        imageUrl: true,
        quizId: true,
      },
    });
    console.log(`  Found ${questions.length} questions with images\n`);

    console.log("Backing up HomeworkSubmission.imageUrl and correctedImageUrl...");
    const homeworkSubmissions = await prisma.homeworkSubmission.findMany({
      select: {
        id: true,
        imageUrl: true,
        correctedImageUrl: true,
        studentId: true,
        chapterId: true,
      },
    });
    console.log(`  Found ${homeworkSubmissions.length} homework submissions\n`);

    console.log("Backing up ActivitySubmission.imageUrl...");
    const activitySubmissions = await prisma.activitySubmission.findMany({
      select: {
        id: true,
        imageUrl: true,
        studentId: true,
        activityId: true,
      },
    });
    console.log(`  Found ${activitySubmissions.length} activity submissions\n`);

    console.log("Backing up Certificate.imageUrl...");
    const certificates = await prisma.certificate.findMany({
      select: {
        id: true,
        imageUrl: true,
        studentId: true,
        assignedBy: true,
      },
    });
    console.log(`  Found ${certificates.length} certificates\n`);

    console.log("Backing up Timetable.imageUrl...");
    const timetables = await prisma.timetable.findMany({
      select: {
        id: true,
        imageUrl: true,
      },
    });
    console.log(`  Found ${timetables.length} timetables\n`);

    console.log("Backing up SubscriptionRequest.transactionImage...");
    const subscriptionRequests = await prisma.subscriptionRequest.findMany({
      select: {
        id: true,
        transactionImage: true,
        subscriptionId: true,
      },
    });
    console.log(`  Found ${subscriptionRequests.length} subscription requests\n`);

    // Create backup object
    const backup: DatabaseBackup = {
      timestamp: new Date().toISOString(),
      version: "1.0",
      data: {
        users,
        courses,
        attachments,
        chapters,
        chapterAttachments,
        questions,
        homeworkSubmissions,
        activitySubmissions,
        certificates,
        timetables,
        subscriptionRequests,
      },
    };

    // Save to file
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(backup, null, 2));

    // Calculate total records
    const totalRecords =
      users.length +
      courses.length +
      attachments.length +
      chapters.length +
      chapterAttachments.length +
      questions.length +
      homeworkSubmissions.length +
      activitySubmissions.length +
      certificates.length +
      timetables.length +
      subscriptionRequests.length;

    console.log("\n" + "=".repeat(50));
    console.log("Backup Summary:");
    console.log(`Total records backed up: ${totalRecords}`);
    console.log(`Backup file: ${BACKUP_FILE}`);
    console.log(`File size: ${(fs.statSync(BACKUP_FILE).size / 1024).toFixed(2)} KB`);
    console.log("=".repeat(50));
    console.log("\n✓ Backup completed successfully!");
    console.log(`\nTo restore, run: npm run restore-db-urls`);
  } catch (error) {
    console.error("Error during backup:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

