/**
 * Database Migration Script: Aiven to Prisma PostgreSQL
 * 
 * This script migrates data from an old PostgreSQL database to the current Prisma schema.
 * 
 * Requirements:
 * - Set AIVEN_DATABASE_URL in your .env or .env.local file
 * - Set PRISMA_DATABASE_URL in your .env or .env.local file
 * - Source DB can be an older schema; the script introspects tables/columns and applies defaults.
 * 
 * Usage:
 *   npm run migrate:aiven
 * 
 * The script will:
 * 1. Count rows in each table from the Aiven database
 * 2. Display the counts for review
 * 3. Migrate all data using idempotent operations (upserts / createMany+skipDuplicates)
 * 4. Verify the migration by counting rows in the Prisma database
 * 
 * Migration order respects foreign key dependencies:
 * User → Course → Attachment/Chapter → ChapterAttachment → (Quiz → Question → QuizResult → QuizAnswer)
 * → Purchase → BalanceTransaction → (LiveStream → LiveStreamAttendance)
 * → (Activity → ActivitySubmission) → HomeworkSubmission → Certificate
 * → Timetable → PromoCode → StudentMessage → SubscriptionPlan → Subscription → SubscriptionRequest
 */

import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";

const AIVEN_DATABASE_URL = process.env.AIVEN_DATABASE_URL;
const PRISMA_DATABASE_URL = process.env.PRISMA_DATABASE_URL;

if (!AIVEN_DATABASE_URL) {
  throw new Error("AIVEN_DATABASE_URL is not set in environment variables");
}

if (!PRISMA_DATABASE_URL) {
  throw new Error("PRISMA_DATABASE_URL is not set in environment variables");
}

// Create Prisma clients for both databases
const aivenClient = new PrismaClient({
  datasources: {
    db: {
      url: AIVEN_DATABASE_URL,
    },
  },
});

const prismaClient = new PrismaClient({
  datasources: {
    db: {
      url: PRISMA_DATABASE_URL,
    },
  },
});

interface TableStats {
  tableName: string;
  rowCount: number;
}

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  if (chunkSize <= 0) return [items];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

function toDeterministicPhoneNumber(input: { id: string; phoneNumber?: string | null }): string {
  const phone = (input.phoneNumber ?? "").trim();
  if (phone) return phone;
  // phoneNumber is required+unique in current schema
  const stable = input.id.replace(/[^0-9a-zA-Z]/g, "").slice(0, 20).toLowerCase() || "unknown";
  return `unknown-${stable}`;
}

function toDeterministicEmail(input: { phoneNumber?: string | null; id: string }): string {
  // Updated schema requires `User.email` (unique). Old DBs may not have it populated.
  // Generate a stable synthetic email so re-running the migration stays idempotent.
  const phone = (input.phoneNumber ?? "").trim();
  const localPart = phone
    ? phone.replace(/[^0-9a-zA-Z]/g, "")
    : input.id.replace(/[^0-9a-zA-Z]/g, "");
  return `${localPart.toLowerCase()}@mhm.local`;
}

async function getExistingTables(client: PrismaClient): Promise<Set<string>> {
  const rows = await client.$queryRawUnsafe<Array<{ table_name: string }>>(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema='public' AND table_type='BASE TABLE'`
  );
  return new Set(rows.map((r) => r.table_name));
}

async function getExistingColumns(client: PrismaClient, tableName: string): Promise<Set<string>> {
  const rows = await client.$queryRawUnsafe<Array<{ column_name: string }>>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema='public' AND table_name=$1`,
    tableName
  );
  return new Set(rows.map((r) => r.column_name));
}

function quoteIdent(ident: string): string {
  return `"${ident.replace(/"/g, '""')}"`;
}

async function selectAllRows<T extends Record<string, any>>(
  client: PrismaClient,
  tableName: string,
  desiredColumns: string[],
  aliases?: Record<string, string>
): Promise<T[]> {
  const cols = await getExistingColumns(client, tableName);
  const selectParts: string[] = [];

  for (const col of desiredColumns) {
    const sourceCol = aliases?.[col] ?? col;
    if (cols.has(sourceCol)) {
      selectParts.push(`${quoteIdent(sourceCol)} as ${quoteIdent(col)}`);
    }
  }

  if (selectParts.length === 0) return [];
  const sql = `SELECT ${selectParts.join(", ")} FROM ${quoteIdent(tableName)}`;
  return client.$queryRawUnsafe<T[]>(sql);
}

/**
 * Count rows in a table from Aiven database
 */
async function countRowsInTable(tableName: string): Promise<number> {
  try {
    const result = await aivenClient.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*) as count FROM "${tableName}"`
    );
    return Number(result[0].count);
  } catch (error) {
    console.error(`Error counting rows in ${tableName}:`, error);
    return 0;
  }
}

/**
 * Get all row counts for all tables
 */
async function getAllTableCounts(tables: string[]): Promise<TableStats[]> {
  console.log("\n📊 Counting rows in Aiven database...\n");
  const stats: TableStats[] = [];

  for (const tableName of tables) {
    const count = await countRowsInTable(tableName);
    stats.push({ tableName, rowCount: count });
    console.log(`  ${tableName.padEnd(25)} ${count.toString().padStart(10)} rows`);
  }

  const totalRows = stats.reduce((sum, stat) => sum + stat.rowCount, 0);
  console.log(`\n  ${"TOTAL".padEnd(25)} ${totalRows.toString().padStart(10)} rows\n`);

  return stats;
}

/**
 * Migrate User table
 */
async function migrateUsers(): Promise<void> {
  console.log("🔄 Migrating Users...");
  const users = await selectAllRows<any>(
    aivenClient,
    "User",
    [
      "id",
      "fullName",
      "name",
      "phoneNumber",
      "email",
      "curriculum",
      "curriculumType",
      "level",
      "language",
      "grade",
      "hashedPassword",
      "image",
      "role",
      "balance",
      "points",
      "parentPhoneNumber",
      "sessionId",
      "lastLoginAt",
      "isSuspended",
      "createdAt",
      "updatedAt",
    ],
    {
      fullName: "fullName",
      name: "name",
    }
  );

  const normalized = users.map((u: any) => {
    const phoneNumber = toDeterministicPhoneNumber({ id: u.id, phoneNumber: u.phoneNumber });
    const fullName = (u.fullName ?? u.name ?? "").toString().trim() || "Unknown";
    return {
      ...u,
      phoneNumber,
      fullName,
      email: (u.email ?? "").toString().trim() || toDeterministicEmail({ phoneNumber, id: u.id }),
      role: (u.role ?? "USER").toString(),
      balance: typeof u.balance === "number" ? u.balance : Number(u.balance ?? 0),
      points: typeof u.points === "number" ? u.points : Number(u.points ?? 0),
      isSuspended: typeof u.isSuspended === "boolean" ? u.isSuspended : Boolean(u.isSuspended ?? false),
    };
  });

  const phoneSet = new Set(normalized.map((u: any) => u.phoneNumber));
  const parentLinks = normalized
    .filter((u: any) => !!u.parentPhoneNumber)
    .map((u: any) => ({ id: u.id, parentPhoneNumber: u.parentPhoneNumber as string }));

  const batches = chunkArray(normalized, 50);
  let processed = 0;

  for (const batch of batches) {
    await Promise.all(
      batch.map((user) =>
        prismaClient.user.upsert({
          where: { id: user.id },
          update: {
            fullName: user.fullName,
            phoneNumber: user.phoneNumber,
            email: user.email,
            curriculum: user.curriculum ?? null,
            curriculumType: user.curriculumType ?? null,
            level: user.level ?? null,
            language: user.language ?? null,
            grade: user.grade ?? null,
            // Parent link is a self-FK by phoneNumber; set it in a second pass to avoid FK violations
            parentPhoneNumber: null,
            hashedPassword: user.hashedPassword,
            image: user.image,
            role: user.role,
            balance: user.balance,
            points: user.points,
            sessionId: user.sessionId ?? null,
            lastLoginAt: user.lastLoginAt ?? null,
            isSuspended: user.isSuspended,
          },
          create: {
            id: user.id,
            fullName: user.fullName,
            phoneNumber: user.phoneNumber,
            email: user.email,
            curriculum: user.curriculum ?? null,
            curriculumType: user.curriculumType ?? null,
            level: user.level ?? null,
            language: user.language ?? null,
            grade: user.grade ?? null,
            parentPhoneNumber: null,
            hashedPassword: user.hashedPassword,
            image: user.image,
            role: user.role,
            balance: user.balance,
            points: user.points,
            sessionId: user.sessionId ?? null,
            lastLoginAt: user.lastLoginAt ?? null,
            isSuspended: user.isSuspended,
            createdAt: user.createdAt ?? undefined,
            updatedAt: user.updatedAt ?? undefined,
          },
        })
      )
    );

    processed += batch.length;
    if (processed % 100 === 0 || processed === users.length) {
      console.log(`  ... ${processed}/${users.length}`);
    }
  }

  // Second pass: apply parentPhoneNumber links only when the parent exists in the same dataset
  if (parentLinks.length) {
    console.log(`  🔗 Linking parents (${parentLinks.length})...`);
    const linkBatches = chunkArray(parentLinks, 200);
    let linked = 0;
    for (const batch of linkBatches) {
      await Promise.all(
        batch.map(({ id, parentPhoneNumber }) =>
          prismaClient.user.update({
            where: { id },
            data: {
              parentPhoneNumber: phoneSet.has(parentPhoneNumber) ? parentPhoneNumber : null,
            },
          })
        )
      );
      linked += batch.length;
      if (linked % 500 === 0 || linked === parentLinks.length) {
        console.log(`  ... ${linked}/${parentLinks.length}`);
      }
    }
  }

  console.log(`  ✅ Migrated ${users.length} users`);
}

/**
 * Migrate Course table
 */
async function migrateCourses(): Promise<void> {
  console.log("🔄 Migrating Courses...");
  const courses = await selectAllRows<any>(aivenClient, "Course", [
    "id",
    "userId",
    "title",
    "description",
    "imageUrl",
    "price",
    "isPublished",
    "isFree",
    "targetCurriculum",
    "targetCurriculumType",
    "targetLevel",
    "targetLanguage",
    "targetGrade",
    "createdAt",
    "updatedAt",
  ]);

  const batches = chunkArray(courses, 50);
  let processed = 0;

  for (const batch of batches) {
    await Promise.all(
      batch.map((course) =>
        prismaClient.course.upsert({
          where: { id: course.id },
          update: {
            userId: course.userId,
            title: course.title,
            description: course.description,
            imageUrl: course.imageUrl,
            price: course.price,
            isPublished: course.isPublished,
            isFree: course.isFree ?? false,
            targetCurriculum: course.targetCurriculum ?? null,
            targetCurriculumType: course.targetCurriculumType ?? null,
            targetLevel: course.targetLevel ?? null,
            targetLanguage: course.targetLanguage ?? null,
            targetGrade: course.targetGrade ?? null,
          },
          create: {
            id: course.id,
            userId: course.userId,
            title: course.title,
            description: course.description,
            imageUrl: course.imageUrl,
            price: course.price,
            isPublished: course.isPublished,
            isFree: course.isFree ?? false,
            targetCurriculum: course.targetCurriculum ?? null,
            targetCurriculumType: course.targetCurriculumType ?? null,
            targetLevel: course.targetLevel ?? null,
            targetLanguage: course.targetLanguage ?? null,
            targetGrade: course.targetGrade ?? null,
            createdAt: course.createdAt ?? undefined,
            updatedAt: course.updatedAt ?? undefined,
          },
        })
      )
    );
    processed += batch.length;
    if (processed === courses.length) {
      console.log(`  ... ${processed}/${courses.length}`);
    }
  }
  console.log(`  ✅ Migrated ${courses.length} courses`);
}

/**
 * Migrate Attachment table
 */
async function migrateAttachments(): Promise<void> {
  console.log("🔄 Migrating Attachments...");
  const attachments = await selectAllRows<any>(aivenClient, "Attachment", [
    "id",
    "name",
    "url",
    "courseId",
    "createdAt",
    "updatedAt",
  ]);

  const batches = chunkArray(attachments, 200);
  let processed = 0;
  for (const batch of batches) {
    await Promise.all(
      batch.map((attachment) =>
        prismaClient.attachment.upsert({
          where: { id: attachment.id },
          update: {
            name: attachment.name,
            url: attachment.url,
            courseId: attachment.courseId,
          },
          create: {
            id: attachment.id,
            name: attachment.name,
            url: attachment.url,
            courseId: attachment.courseId,
            createdAt: attachment.createdAt ?? undefined,
            updatedAt: attachment.updatedAt ?? undefined,
          },
        })
      )
    );
    processed += batch.length;
    if (processed % 500 === 0 || processed === attachments.length) {
      console.log(`  ... ${processed}/${attachments.length}`);
    }
  }
  console.log(`  ✅ Migrated ${attachments.length} attachments`);
}

/**
 * Migrate Chapter table
 */
async function migrateChapters(): Promise<void> {
  console.log("🔄 Migrating Chapters...");
  const chapters = await selectAllRows<any>(aivenClient, "Chapter", [
    "id",
    "title",
    "description",
    "videoUrl",
    "videoType",
    "youtubeVideoId",
    "documentUrl",
    "documentName",
    "position",
    "isPublished",
    "isFree",
    "courseId",
    "createdAt",
    "updatedAt",
  ]);

  const batches = chunkArray(chapters, 200);
  let processed = 0;
  for (const batch of batches) {
    await Promise.all(
      batch.map((chapter) =>
        prismaClient.chapter.upsert({
          where: { id: chapter.id },
          update: {
            title: chapter.title,
            description: chapter.description,
            videoUrl: chapter.videoUrl,
            videoType: chapter.videoType || "UPLOAD",
            youtubeVideoId: chapter.youtubeVideoId,
            documentUrl: chapter.documentUrl,
            documentName: chapter.documentName,
            position: chapter.position,
            isPublished: chapter.isPublished,
            isFree: chapter.isFree,
            courseId: chapter.courseId,
          },
          create: {
            id: chapter.id,
            title: chapter.title,
            description: chapter.description,
            videoUrl: chapter.videoUrl,
            videoType: chapter.videoType || "UPLOAD",
            youtubeVideoId: chapter.youtubeVideoId,
            documentUrl: chapter.documentUrl,
            documentName: chapter.documentName,
            position: chapter.position,
            isPublished: chapter.isPublished,
            isFree: chapter.isFree,
            courseId: chapter.courseId,
            createdAt: chapter.createdAt ?? undefined,
            updatedAt: chapter.updatedAt ?? undefined,
          },
        })
      )
    );
    processed += batch.length;
    if (processed === chapters.length) {
      console.log(`  ... ${processed}/${chapters.length}`);
    }
  }
  console.log(`  ✅ Migrated ${chapters.length} chapters`);
}

/**
 * Migrate ChapterAttachment table
 */
async function migrateChapterAttachments(): Promise<void> {
  console.log("🔄 Migrating ChapterAttachments...");
  const chapterAttachments = await selectAllRows<any>(aivenClient, "ChapterAttachment", [
    "id",
    "name",
    "url",
    "position",
    "chapterId",
    "createdAt",
    "updatedAt",
  ]);

  const batches = chunkArray(chapterAttachments, 200);
  let processed = 0;
  for (const batch of batches) {
    await Promise.all(
      batch.map((attachment) =>
        prismaClient.chapterAttachment.upsert({
          where: { id: attachment.id },
          update: {
            name: attachment.name,
            url: attachment.url,
            position: attachment.position,
            chapterId: attachment.chapterId,
          },
          create: {
            id: attachment.id,
            name: attachment.name,
            url: attachment.url,
            position: attachment.position,
            chapterId: attachment.chapterId,
            createdAt: attachment.createdAt ?? undefined,
            updatedAt: attachment.updatedAt ?? undefined,
          },
        })
      )
    );
    processed += batch.length;
    if (processed === chapterAttachments.length) {
      console.log(`  ... ${processed}/${chapterAttachments.length}`);
    }
  }
  console.log(`  ✅ Migrated ${chapterAttachments.length} chapter attachments`);
}

/**
 * Migrate UserProgress table
 */
async function migrateUserProgress(): Promise<void> {
  console.log("🔄 Migrating UserProgress...");
  const userProgress = await selectAllRows<any>(aivenClient, "UserProgress", [
    "id",
    "userId",
    "chapterId",
    "isCompleted",
    "createdAt",
    "updatedAt",
  ]);

  const batches = chunkArray(userProgress, 200);
  let processed = 0;
  for (const batch of batches) {
    await Promise.all(
      batch.map((progress) =>
        prismaClient.userProgress.upsert({
          where: {
            userId_chapterId: {
              userId: progress.userId,
              chapterId: progress.chapterId,
            },
          },
          update: {
            isCompleted: progress.isCompleted,
          },
          create: {
            id: progress.id,
            userId: progress.userId,
            chapterId: progress.chapterId,
            isCompleted: progress.isCompleted,
            createdAt: progress.createdAt ?? undefined,
            updatedAt: progress.updatedAt ?? undefined,
          },
        })
      )
    );
    processed += batch.length;
    if (processed % 500 === 0 || processed === userProgress.length) {
      console.log(`  ... ${processed}/${userProgress.length}`);
    }
  }
  console.log(`  ✅ Migrated ${userProgress.length} user progress records`);
}

/**
 * Migrate Purchase table
 */
async function migratePurchases(): Promise<void> {
  console.log("🔄 Migrating Purchases...");
  const purchases = await selectAllRows<any>(aivenClient, "Purchase", [
    "id",
    "userId",
    "courseId",
    "status",
    "createdAt",
    "updatedAt",
  ]);

  const batches = chunkArray(purchases, 200);
  let processed = 0;
  for (const batch of batches) {
    await Promise.all(
      batch.map((purchase) =>
        prismaClient.purchase.upsert({
          where: {
            userId_courseId: {
              userId: purchase.userId,
              courseId: purchase.courseId,
            },
          },
          update: {
            status: purchase.status ?? "ACTIVE",
          },
          create: {
            id: purchase.id,
            userId: purchase.userId,
            courseId: purchase.courseId,
            status: purchase.status ?? "ACTIVE",
            createdAt: purchase.createdAt ?? undefined,
            updatedAt: purchase.updatedAt ?? undefined,
          },
        })
      )
    );
    processed += batch.length;
    if (processed % 500 === 0 || processed === purchases.length) {
      console.log(`  ... ${processed}/${purchases.length}`);
    }
  }
  console.log(`  ✅ Migrated ${purchases.length} purchases`);
}

/**
 * Migrate BalanceTransaction table
 */
async function migrateBalanceTransactions(): Promise<void> {
  console.log("🔄 Migrating BalanceTransactions...");
  const transactions = await selectAllRows<any>(aivenClient, "BalanceTransaction", [
    "id",
    "userId",
    "amount",
    "type",
    "description",
    "createdAt",
    "updatedAt",
  ]);

  const batches = chunkArray(transactions, 200);
  let processed = 0;
  for (const batch of batches) {
    await Promise.all(
      batch.map((transaction) =>
        prismaClient.balanceTransaction.upsert({
          where: { id: transaction.id },
          update: {
            userId: transaction.userId,
            amount: transaction.amount,
            type: transaction.type,
            description: transaction.description,
          },
          create: {
            id: transaction.id,
            userId: transaction.userId,
            amount: transaction.amount,
            type: transaction.type,
            description: transaction.description,
            createdAt: transaction.createdAt ?? undefined,
            updatedAt: transaction.updatedAt ?? undefined,
          },
        })
      )
    );
    processed += batch.length;
    if (processed === transactions.length) {
      console.log(`  ... ${processed}/${transactions.length}`);
    }
  }
  console.log(`  ✅ Migrated ${transactions.length} balance transactions`);
}

/**
 * Migrate Quiz table
 */
async function migrateQuizzes(): Promise<void> {
  console.log("🔄 Migrating Quizzes...");
  const quizzes = await selectAllRows<any>(aivenClient, "Quiz", [
    "id",
    "title",
    "description",
    "position",
    "isPublished",
    "timer",
    "maxAttempts",
    "courseId",
    "createdAt",
    "updatedAt",
  ]);

  for (const quiz of quizzes) {
    await prismaClient.quiz.upsert({
      where: { id: quiz.id },
      update: {
        title: quiz.title,
        description: quiz.description,
        position: quiz.position,
        isPublished: quiz.isPublished,
        timer: quiz.timer,
        maxAttempts: quiz.maxAttempts ?? 1,
        courseId: quiz.courseId,
        createdAt: quiz.createdAt,
        updatedAt: quiz.updatedAt,
      },
      create: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        position: quiz.position,
        isPublished: quiz.isPublished,
        timer: quiz.timer,
        maxAttempts: quiz.maxAttempts ?? 1,
        courseId: quiz.courseId,
        createdAt: quiz.createdAt,
        updatedAt: quiz.updatedAt,
      },
    });
  }
  console.log(`  ✅ Migrated ${quizzes.length} quizzes`);
}

/**
 * Migrate Question table
 */
async function migrateQuestions(): Promise<void> {
  console.log("🔄 Migrating Questions...");
  const questions = await selectAllRows<any>(aivenClient, "Question", [
    "id",
    "text",
    "type",
    "options",
    "correctAnswer",
    "points",
    "imageUrl",
    "position",
    "quizId",
    "createdAt",
    "updatedAt",
  ]);

  for (const question of questions) {
    await prismaClient.question.upsert({
      where: { id: question.id },
      update: {
        text: question.text,
        type: question.type,
        options: question.options,
        correctAnswer: question.correctAnswer,
        points: question.points ?? 1,
        imageUrl: question.imageUrl,
        position: question.position ?? 1,
        quizId: question.quizId,
        createdAt: question.createdAt,
        updatedAt: question.updatedAt,
      },
      create: {
        id: question.id,
        text: question.text,
        type: question.type,
        options: question.options,
        correctAnswer: question.correctAnswer,
        points: question.points ?? 1,
        imageUrl: question.imageUrl,
        position: question.position ?? 1,
        quizId: question.quizId,
        createdAt: question.createdAt,
        updatedAt: question.updatedAt,
      },
    });
  }
  console.log(`  ✅ Migrated ${questions.length} questions`);
}

/**
 * Migrate QuizResult table
 */
async function migrateQuizResults(): Promise<void> {
  console.log("🔄 Migrating QuizResults...");
  const quizResults = await selectAllRows<any>(aivenClient, "QuizResult", [
    "id",
    "studentId",
    "quizId",
    "score",
    "totalPoints",
    "percentage",
    "attemptNumber",
    "submittedAt",
    "createdAt",
    "updatedAt",
  ]);

  for (const result of quizResults) {
    await prismaClient.quizResult.upsert({
      where: { id: result.id },
      update: {
        studentId: result.studentId,
        quizId: result.quizId,
        score: result.score,
        totalPoints: result.totalPoints,
        percentage: result.percentage,
        attemptNumber: result.attemptNumber ?? 1,
        submittedAt: result.submittedAt,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      },
      create: {
        id: result.id,
        studentId: result.studentId,
        quizId: result.quizId,
        score: result.score,
        totalPoints: result.totalPoints,
        percentage: result.percentage,
        attemptNumber: result.attemptNumber ?? 1,
        submittedAt: result.submittedAt,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      },
    });
  }
  console.log(`  ✅ Migrated ${quizResults.length} quiz results`);
}

/**
 * Migrate QuizAnswer table
 */
async function migrateQuizAnswers(): Promise<void> {
  console.log("🔄 Migrating QuizAnswers...");
  const quizAnswers = await selectAllRows<any>(aivenClient, "QuizAnswer", [
    "id",
    "questionId",
    "quizResultId",
    "studentAnswer",
    "correctAnswer",
    "isCorrect",
    "pointsEarned",
    "createdAt",
    "updatedAt",
  ]);

  const batches = chunkArray(quizAnswers, 200);
  let processed = 0;

  for (const batch of batches) {
    await Promise.all(
      batch.map((answer) =>
        prismaClient.quizAnswer.upsert({
          where: { id: answer.id },
          update: {
            questionId: answer.questionId,
            quizResultId: answer.quizResultId,
            studentAnswer: answer.studentAnswer,
            correctAnswer: answer.correctAnswer,
            isCorrect: answer.isCorrect,
            pointsEarned: answer.pointsEarned,
            createdAt: answer.createdAt,
            updatedAt: answer.updatedAt,
          },
          create: {
            id: answer.id,
            questionId: answer.questionId,
            quizResultId: answer.quizResultId,
            studentAnswer: answer.studentAnswer,
            correctAnswer: answer.correctAnswer,
            isCorrect: answer.isCorrect,
            pointsEarned: answer.pointsEarned,
            createdAt: answer.createdAt,
            updatedAt: answer.updatedAt,
          },
        })
      )
    );

    processed += batch.length;
    if (processed % 500 === 0 || processed === quizAnswers.length) {
      console.log(`  ... ${processed}/${quizAnswers.length}`);
    }
  }
  console.log(`  ✅ Migrated ${quizAnswers.length} quiz answers`);
}

async function migrateLiveStreams(): Promise<void> {
  console.log("🔄 Migrating LiveStreams...");
  const liveStreams = await selectAllRows<any>(aivenClient, "LiveStream", [
    "id",
    "title",
    "description",
    "meetingUrl",
    "meetingId",
    "meetingType",
    "position",
    "isPublished",
    "scheduledAt",
    "duration",
    "courseId",
    "createdAt",
    "updatedAt",
  ]);

  const batches = chunkArray(liveStreams, 100);
  let processed = 0;
  for (const batch of batches) {
    await Promise.all(
      batch.map((ls) =>
        prismaClient.liveStream.upsert({
          where: { id: ls.id },
          update: {
            title: ls.title,
            description: ls.description ?? null,
            meetingUrl: ls.meetingUrl,
            meetingId: ls.meetingId,
            meetingType: ls.meetingType,
            position: ls.position ?? 0,
            isPublished: ls.isPublished ?? false,
            scheduledAt: ls.scheduledAt ?? null,
            duration: ls.duration ?? null,
            courseId: ls.courseId,
          },
          create: {
            id: ls.id,
            title: ls.title,
            description: ls.description ?? null,
            meetingUrl: ls.meetingUrl,
            meetingId: ls.meetingId,
            meetingType: ls.meetingType,
            position: ls.position ?? 0,
            isPublished: ls.isPublished ?? false,
            scheduledAt: ls.scheduledAt ?? null,
            duration: ls.duration ?? null,
            courseId: ls.courseId,
            createdAt: ls.createdAt ?? undefined,
            updatedAt: ls.updatedAt ?? undefined,
          },
        })
      )
    );
    processed += batch.length;
    if (processed % 500 === 0 || processed === liveStreams.length) {
      console.log(`  ... ${processed}/${liveStreams.length}`);
    }
  }
  console.log(`  ✅ Migrated ${liveStreams.length} live streams`);
}

async function migrateLiveStreamAttendance(): Promise<void> {
  console.log("🔄 Migrating LiveStreamAttendance...");
  const attendance = await selectAllRows<any>(aivenClient, "LiveStreamAttendance", [
    "id",
    "liveStreamId",
    "studentId",
    "clickedAt",
  ]);

  const batches = chunkArray(attendance, 500);
  let processed = 0;
  for (const batch of batches) {
    await Promise.all(
      batch.map((row) =>
        prismaClient.liveStreamAttendance.upsert({
          where: { id: row.id },
          update: {
            liveStreamId: row.liveStreamId,
            studentId: row.studentId,
            clickedAt: row.clickedAt,
          },
          create: {
            id: row.id,
            liveStreamId: row.liveStreamId,
            studentId: row.studentId,
            clickedAt: row.clickedAt,
          },
        })
      )
    );
    processed += batch.length;
    if (processed % 2000 === 0 || processed === attendance.length) {
      console.log(`  ... ${processed}/${attendance.length}`);
    }
  }
  console.log(`  ✅ Migrated ${attendance.length} attendance records`);
}

async function migrateActivities(): Promise<void> {
  console.log("🔄 Migrating Activities...");
  const activities = await selectAllRows<any>(aivenClient, "Activity", [
    "id",
    "chapterId",
    "title",
    "description",
    "isRequired",
    "createdAt",
    "updatedAt",
  ]);

  const batches = chunkArray(activities, 200);
  let processed = 0;
  for (const batch of batches) {
    await Promise.all(
      batch.map((a) =>
        prismaClient.activity.upsert({
          where: { id: a.id },
          update: {
            chapterId: a.chapterId,
            title: a.title,
            description: a.description ?? null,
            isRequired: a.isRequired ?? true,
          },
          create: {
            id: a.id,
            chapterId: a.chapterId,
            title: a.title,
            description: a.description ?? null,
            isRequired: a.isRequired ?? true,
            createdAt: a.createdAt ?? undefined,
            updatedAt: a.updatedAt ?? undefined,
          },
        })
      )
    );
    processed += batch.length;
    if (processed % 1000 === 0 || processed === activities.length) {
      console.log(`  ... ${processed}/${activities.length}`);
    }
  }
  console.log(`  ✅ Migrated ${activities.length} activities`);
}

async function migrateActivitySubmissions(): Promise<void> {
  console.log("🔄 Migrating ActivitySubmissions...");
  const submissions = await selectAllRows<any>(aivenClient, "ActivitySubmission", [
    "id",
    "studentId",
    "activityId",
    "imageUrl",
    "createdAt",
    "updatedAt",
  ]);

  const batches = chunkArray(submissions, 200);
  let processed = 0;
  for (const batch of batches) {
    await Promise.all(
      batch.map((s) =>
        prismaClient.activitySubmission.upsert({
          where: { id: s.id },
          update: {
            studentId: s.studentId,
            activityId: s.activityId,
            imageUrl: s.imageUrl,
          },
          create: {
            id: s.id,
            studentId: s.studentId,
            activityId: s.activityId,
            imageUrl: s.imageUrl,
            createdAt: s.createdAt ?? undefined,
            updatedAt: s.updatedAt ?? undefined,
          },
        })
      )
    );
    processed += batch.length;
    if (processed % 1000 === 0 || processed === submissions.length) {
      console.log(`  ... ${processed}/${submissions.length}`);
    }
  }
  console.log(`  ✅ Migrated ${submissions.length} activity submissions`);
}

async function migrateHomeworkSubmissions(): Promise<void> {
  console.log("🔄 Migrating HomeworkSubmissions...");
  const rows = await selectAllRows<any>(aivenClient, "HomeworkSubmission", [
    "id",
    "studentId",
    "chapterId",
    "imageUrl",
    "imageUrls",
    "correctedImageUrls",
    "createdAt",
    "updatedAt",
  ]);

  const normalized = rows.map((r) => {
    const imageUrl = (r.imageUrl ?? "").toString();
    const imageUrls: string[] = Array.isArray(r.imageUrls)
      ? r.imageUrls
      : imageUrl && imageUrl !== ""
        ? [imageUrl]
        : [];
    const correctedImageUrls: string[] = Array.isArray(r.correctedImageUrls) ? r.correctedImageUrls : [];
    return {
      ...r,
      imageUrl: imageUrl || (imageUrls[0] ?? ""),
      imageUrls,
      correctedImageUrls,
    };
  });

  const batches = chunkArray(normalized, 200);
  let processed = 0;
  for (const batch of batches) {
    await Promise.all(
      batch.map((hs) =>
        prismaClient.homeworkSubmission.upsert({
          where: { id: hs.id },
          update: {
            studentId: hs.studentId,
            chapterId: hs.chapterId,
            imageUrl: hs.imageUrl,
            imageUrls: hs.imageUrls,
            correctedImageUrls: hs.correctedImageUrls,
          },
          create: {
            id: hs.id,
            studentId: hs.studentId,
            chapterId: hs.chapterId,
            imageUrl: hs.imageUrl,
            imageUrls: hs.imageUrls,
            correctedImageUrls: hs.correctedImageUrls,
            createdAt: hs.createdAt ?? undefined,
            updatedAt: hs.updatedAt ?? undefined,
          },
        })
      )
    );
    processed += batch.length;
    if (processed % 1000 === 0 || processed === normalized.length) {
      console.log(`  ... ${processed}/${normalized.length}`);
    }
  }
  console.log(`  ✅ Migrated ${normalized.length} homework submissions`);
}

async function migrateCertificates(): Promise<void> {
  console.log("🔄 Migrating Certificates...");
  const rows = await selectAllRows<any>(aivenClient, "Certificate", [
    "id",
    "studentId",
    "assignedBy",
    "imageUrl",
    "title",
    "description",
    "createdAt",
    "updatedAt",
  ]);

  const batches = chunkArray(rows, 200);
  let processed = 0;
  for (const batch of batches) {
    await Promise.all(
      batch.map((c) =>
        prismaClient.certificate.upsert({
          where: { id: c.id },
          update: {
            studentId: c.studentId,
            assignedBy: c.assignedBy,
            imageUrl: c.imageUrl,
            title: c.title ?? null,
            description: c.description ?? null,
          },
          create: {
            id: c.id,
            studentId: c.studentId,
            assignedBy: c.assignedBy,
            imageUrl: c.imageUrl,
            title: c.title ?? null,
            description: c.description ?? null,
            createdAt: c.createdAt ?? undefined,
            updatedAt: c.updatedAt ?? undefined,
          },
        })
      )
    );
    processed += batch.length;
    if (processed % 1000 === 0 || processed === rows.length) {
      console.log(`  ... ${processed}/${rows.length}`);
    }
  }
  console.log(`  ✅ Migrated ${rows.length} certificates`);
}

async function migrateTimetables(): Promise<void> {
  console.log("🔄 Migrating Timetables...");
  const rows = await selectAllRows<any>(aivenClient, "Timetable", [
    "id",
    "imageUrl",
    "targetCurriculum",
    "targetCurriculumType",
    "targetGrade",
    "targetSection",
    "courseId",
    "dayOfWeek",
    "startTime",
    "endTime",
    "title",
    "description",
    "createdAt",
    "updatedAt",
  ]);

  const batches = chunkArray(rows, 200);
  let processed = 0;
  for (const batch of batches) {
    await Promise.all(
      batch.map((t) =>
        prismaClient.timetable.upsert({
          where: { id: t.id },
          update: {
            imageUrl: t.imageUrl,
            targetCurriculum: t.targetCurriculum ?? null,
            targetCurriculumType: t.targetCurriculumType ?? null,
            targetGrade: t.targetGrade ?? null,
            targetSection: t.targetSection ?? null,
            courseId: t.courseId ?? null,
            dayOfWeek: t.dayOfWeek ?? null,
            startTime: t.startTime ?? null,
            endTime: t.endTime ?? null,
            title: t.title ?? null,
            description: t.description ?? null,
          },
          create: {
            id: t.id,
            imageUrl: t.imageUrl,
            targetCurriculum: t.targetCurriculum ?? null,
            targetCurriculumType: t.targetCurriculumType ?? null,
            targetGrade: t.targetGrade ?? null,
            targetSection: t.targetSection ?? null,
            courseId: t.courseId ?? null,
            dayOfWeek: t.dayOfWeek ?? null,
            startTime: t.startTime ?? null,
            endTime: t.endTime ?? null,
            title: t.title ?? null,
            description: t.description ?? null,
            createdAt: t.createdAt ?? undefined,
            updatedAt: t.updatedAt ?? undefined,
          },
        })
      )
    );
    processed += batch.length;
    if (processed % 1000 === 0 || processed === rows.length) {
      console.log(`  ... ${processed}/${rows.length}`);
    }
  }
  console.log(`  ✅ Migrated ${rows.length} timetables`);
}

async function migratePromoCodes(): Promise<void> {
  console.log("🔄 Migrating PromoCodes...");
  const rows = await selectAllRows<any>(aivenClient, "PromoCode", [
    "id",
    "code",
    "studentId",
    "createdBy",
    "discountPercentage",
    "isUsed",
    "status",
    "requestedAt",
    "createdAt",
    "updatedAt",
  ]);

  const batches = chunkArray(rows, 200);
  let processed = 0;
  for (const batch of batches) {
    await Promise.all(
      batch.map((p) =>
        prismaClient.promoCode.upsert({
          where: { id: p.id },
          update: {
            code: p.code ?? null,
            studentId: p.studentId,
            createdBy: p.createdBy ?? null,
            discountPercentage: p.discountPercentage ?? null,
            isUsed: p.isUsed ?? false,
            status: p.status ?? "requested",
            requestedAt: p.requestedAt ?? undefined,
          },
          create: {
            id: p.id,
            code: p.code ?? null,
            studentId: p.studentId,
            createdBy: p.createdBy ?? null,
            discountPercentage: p.discountPercentage ?? null,
            isUsed: p.isUsed ?? false,
            status: p.status ?? "requested",
            requestedAt: p.requestedAt ?? undefined,
            createdAt: p.createdAt ?? undefined,
            updatedAt: p.updatedAt ?? undefined,
          },
        })
      )
    );
    processed += batch.length;
    if (processed % 1000 === 0 || processed === rows.length) {
      console.log(`  ... ${processed}/${rows.length}`);
    }
  }
  console.log(`  ✅ Migrated ${rows.length} promo codes`);
}

async function migrateStudentMessages(): Promise<void> {
  console.log("🔄 Migrating StudentMessages...");
  const rows = await selectAllRows<any>(aivenClient, "StudentMessage", [
    "id",
    "message",
    "isActive",
    "targetCurriculum",
    "targetLevel",
    "targetLanguage",
    "targetGrade",
    "createdBy",
    "createdAt",
    "updatedAt",
  ]);

  const batches = chunkArray(rows, 200);
  let processed = 0;
  for (const batch of batches) {
    await Promise.all(
      batch.map((m) =>
        prismaClient.studentMessage.upsert({
          where: { id: m.id },
          update: {
            message: m.message,
            isActive: m.isActive ?? true,
            targetCurriculum: m.targetCurriculum ?? null,
            targetLevel: m.targetLevel ?? null,
            targetLanguage: m.targetLanguage ?? null,
            targetGrade: m.targetGrade ?? null,
            createdBy: m.createdBy,
          },
          create: {
            id: m.id,
            message: m.message,
            isActive: m.isActive ?? true,
            targetCurriculum: m.targetCurriculum ?? null,
            targetLevel: m.targetLevel ?? null,
            targetLanguage: m.targetLanguage ?? null,
            targetGrade: m.targetGrade ?? null,
            createdBy: m.createdBy,
            createdAt: m.createdAt ?? undefined,
            updatedAt: m.updatedAt ?? undefined,
          },
        })
      )
    );
    processed += batch.length;
    if (processed % 1000 === 0 || processed === rows.length) {
      console.log(`  ... ${processed}/${rows.length}`);
    }
  }
  console.log(`  ✅ Migrated ${rows.length} student messages`);
}

async function migrateSubscriptionPlans(): Promise<void> {
  console.log("🔄 Migrating SubscriptionPlans...");
  const rows = await selectAllRows<any>(aivenClient, "SubscriptionPlan", [
    "id",
    "curriculum",
    "level",
    "language",
    "grade",
    "price",
    "duration",
    "isActive",
    "description",
    "createdAt",
    "updatedAt",
  ]);

  const batches = chunkArray(rows, 200);
  let processed = 0;
  for (const batch of batches) {
    await Promise.all(
      batch.map((p) =>
        prismaClient.subscriptionPlan.upsert({
          where: { id: p.id },
          update: {
            curriculum: p.curriculum,
            level: p.level ?? null,
            language: p.language ?? null,
            grade: p.grade,
            price: Number(p.price),
            duration: p.duration ?? 30,
            isActive: p.isActive ?? true,
            description: p.description ?? null,
          },
          create: {
            id: p.id,
            curriculum: p.curriculum,
            level: p.level ?? null,
            language: p.language ?? null,
            grade: p.grade,
            price: Number(p.price),
            duration: p.duration ?? 30,
            isActive: p.isActive ?? true,
            description: p.description ?? null,
            createdAt: p.createdAt ?? undefined,
            updatedAt: p.updatedAt ?? undefined,
          },
        })
      )
    );
    processed += batch.length;
    if (processed % 1000 === 0 || processed === rows.length) {
      console.log(`  ... ${processed}/${rows.length}`);
    }
  }
  console.log(`  ✅ Migrated ${rows.length} subscription plans`);
}

async function migrateSubscriptions(): Promise<void> {
  console.log("🔄 Migrating Subscriptions...");
  const rows = await selectAllRows<any>(aivenClient, "Subscription", [
    "id",
    "userId",
    "planId",
    "status",
    "startDate",
    "endDate",
    "createdAt",
    "updatedAt",
  ]);

  const batches = chunkArray(rows, 200);
  let processed = 0;
  for (const batch of batches) {
    await Promise.all(
      batch.map((s) =>
        prismaClient.subscription.upsert({
          where: { id: s.id },
          update: {
            userId: s.userId,
            planId: s.planId,
            status: s.status ?? "PENDING",
            startDate: s.startDate ?? null,
            endDate: s.endDate ?? null,
          },
          create: {
            id: s.id,
            userId: s.userId,
            planId: s.planId,
            status: s.status ?? "PENDING",
            startDate: s.startDate ?? null,
            endDate: s.endDate ?? null,
            createdAt: s.createdAt ?? undefined,
            updatedAt: s.updatedAt ?? undefined,
          },
        })
      )
    );
    processed += batch.length;
    if (processed % 1000 === 0 || processed === rows.length) {
      console.log(`  ... ${processed}/${rows.length}`);
    }
  }
  console.log(`  ✅ Migrated ${rows.length} subscriptions`);
}

async function migrateSubscriptionRequests(): Promise<void> {
  console.log("🔄 Migrating SubscriptionRequests...");
  const rows = await selectAllRows<any>(aivenClient, "SubscriptionRequest", [
    "id",
    "subscriptionId",
    "transactionImage",
    "status",
    "reviewedBy",
    "reviewedAt",
    "createdAt",
    "updatedAt",
  ]);

  const batches = chunkArray(rows, 200);
  let processed = 0;
  for (const batch of batches) {
    await Promise.all(
      batch.map((r) =>
        prismaClient.subscriptionRequest.upsert({
          where: { id: r.id },
          update: {
            subscriptionId: r.subscriptionId,
            transactionImage: r.transactionImage,
            status: r.status ?? "PENDING",
            reviewedBy: r.reviewedBy ?? null,
            reviewedAt: r.reviewedAt ?? null,
          },
          create: {
            id: r.id,
            subscriptionId: r.subscriptionId,
            transactionImage: r.transactionImage,
            status: r.status ?? "PENDING",
            reviewedBy: r.reviewedBy ?? null,
            reviewedAt: r.reviewedAt ?? null,
            createdAt: r.createdAt ?? undefined,
            updatedAt: r.updatedAt ?? undefined,
          },
        })
      )
    );
    processed += batch.length;
    if (processed % 1000 === 0 || processed === rows.length) {
      console.log(`  ... ${processed}/${rows.length}`);
    }
  }
  console.log(`  ✅ Migrated ${rows.length} subscription requests`);
}

/**
 * Create Prisma database schema if it doesn't exist
 */
async function ensurePrismaSchema(): Promise<void> {
  try {
    // Try to query the User table to verify schema exists
    await prismaClient.$queryRawUnsafe(`SELECT 1 FROM "User" LIMIT 1`);
    return; // Schema exists, nothing to do
  } catch (error: any) {
    if (error.code === "P2021" || error.message?.includes("does not exist")) {
      console.log("  ⚠️  Schema not found. Creating schema from schema.prisma...\n");
      
      // Save original DATABASE_URL
      const originalDatabaseUrl = process.env.DATABASE_URL;
      
      try {
        // Temporarily set DATABASE_URL to PRISMA_DATABASE_URL for prisma db push
        process.env.DATABASE_URL = PRISMA_DATABASE_URL;
        
        console.log("  🔄 Running: npx prisma db push --skip-generate\n");
        execSync("npx prisma db push --skip-generate --accept-data-loss", {
          stdio: "inherit",
          env: { ...process.env, DATABASE_URL: PRISMA_DATABASE_URL },
        });
        
        console.log("\n  ✅ Schema created successfully!\n");
        
        // Verify it was created
        await prismaClient.$queryRawUnsafe(`SELECT 1 FROM "User" LIMIT 1`);
      } catch (pushError: any) {
        console.error("\n  ❌ Failed to create schema automatically.\n");
        console.error("   Please run manually:");
        console.error(`   $env:DATABASE_URL="${PRISMA_DATABASE_URL}"; npx prisma db push\n`);
        throw new Error(
          "Failed to create Prisma database schema. Please run 'npx prisma db push' manually with DATABASE_URL set to PRISMA_DATABASE_URL."
        );
      } finally {
        // Restore original DATABASE_URL
        if (originalDatabaseUrl) {
          process.env.DATABASE_URL = originalDatabaseUrl;
        } else {
          delete process.env.DATABASE_URL;
        }
      }
    } else {
      throw error;
    }
  }
}

/**
 * Main migration function
 */
async function migrate(): Promise<void> {
  try {
    console.log("🚀 Starting database migration from Aiven to Prisma PostgreSQL\n");
    console.log(`📡 Aiven DB: ${AIVEN_DATABASE_URL?.replace(/:[^:@]+@/, ":****@")}`);
    console.log(`📡 Prisma DB: ${PRISMA_DATABASE_URL?.replace(/:[^:@]+@/, ":****@")}\n`);

    // Test connections
    console.log("🔌 Testing connections...");
    await aivenClient.$connect();
    await prismaClient.$connect();
    console.log("  ✅ Both connections successful\n");

    // Ensure Prisma schema exists (create if needed)
    console.log("🔍 Checking Prisma database schema...");
    await ensurePrismaSchema();
    console.log("  ✅ Schema ready\n");

    const existingSourceTables = await getExistingTables(aivenClient);
    const desiredTableOrder = [
      "User",
      "Course",
      "Attachment",
      "Chapter",
      "ChapterAttachment",
      "UserProgress",
      "Quiz",
      "Question",
      "QuizResult",
      "QuizAnswer",
      "Purchase",
      "BalanceTransaction",
      "LiveStream",
      "LiveStreamAttendance",
      "Activity",
      "ActivitySubmission",
      "HomeworkSubmission",
      "Certificate",
      "Timetable",
      "PromoCode",
      "StudentMessage",
      "SubscriptionPlan",
      "Subscription",
      "SubscriptionRequest",
    ];
    const tablesToCount = desiredTableOrder.filter((t) => existingSourceTables.has(t));

    // Count rows before migration (only tables that exist in source)
    const stats = await getAllTableCounts(tablesToCount);

    // Confirm before proceeding
    console.log("⚠️  Ready to migrate data. This will use upsert operations.");
    console.log("   Existing records will be updated if they exist.\n");

    // Perform migration in correct order
    if (existingSourceTables.has("User")) await migrateUsers();
    if (existingSourceTables.has("Course")) await migrateCourses();
    if (existingSourceTables.has("Attachment")) await migrateAttachments();
    if (existingSourceTables.has("Chapter")) await migrateChapters();
    if (existingSourceTables.has("ChapterAttachment")) await migrateChapterAttachments();
    if (existingSourceTables.has("UserProgress")) await migrateUserProgress();
    if (existingSourceTables.has("Quiz")) await migrateQuizzes();
    if (existingSourceTables.has("Question")) await migrateQuestions();
    if (existingSourceTables.has("QuizResult")) await migrateQuizResults();
    if (existingSourceTables.has("QuizAnswer")) await migrateQuizAnswers();
    if (existingSourceTables.has("Purchase")) await migratePurchases();
    if (existingSourceTables.has("BalanceTransaction")) await migrateBalanceTransactions();
    if (existingSourceTables.has("LiveStream")) await migrateLiveStreams();
    if (existingSourceTables.has("LiveStreamAttendance")) await migrateLiveStreamAttendance();
    if (existingSourceTables.has("Activity")) await migrateActivities();
    if (existingSourceTables.has("ActivitySubmission")) await migrateActivitySubmissions();
    if (existingSourceTables.has("HomeworkSubmission")) await migrateHomeworkSubmissions();
    if (existingSourceTables.has("Certificate")) await migrateCertificates();
    if (existingSourceTables.has("Timetable")) await migrateTimetables();
    if (existingSourceTables.has("PromoCode")) await migratePromoCodes();
    if (existingSourceTables.has("StudentMessage")) await migrateStudentMessages();
    if (existingSourceTables.has("SubscriptionPlan")) await migrateSubscriptionPlans();
    if (existingSourceTables.has("Subscription")) await migrateSubscriptions();
    if (existingSourceTables.has("SubscriptionRequest")) await migrateSubscriptionRequests();

    console.log("\n✅ Migration completed successfully!\n");

    // Count rows after migration in Prisma database
    console.log("📊 Verifying migrated data in Prisma database...\n");
    for (const stat of stats) {
      const count = await prismaClient.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*) as count FROM "${stat.tableName}"`
      );
      const prismaCount = Number(count[0].count);
      const match = prismaCount === stat.rowCount ? "✅" : "⚠️";
      console.log(
        `  ${match} ${stat.tableName.padEnd(25)} Aiven: ${stat.rowCount.toString().padStart(6)} → Prisma: ${prismaCount.toString().padStart(6)}`
      );
    }

    console.log("\n🎉 All done!");
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    throw error;
  } finally {
    await aivenClient.$disconnect();
    await prismaClient.$disconnect();
  }
}

// Run migration
migrate()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

