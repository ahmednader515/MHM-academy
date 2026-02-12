import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();
const MAPPING_FILE = path.join(process.cwd(), "scripts", "uploadthing-to-r2-mapping.json");

interface FileMapping {
  uploadthingUrl: string;
  r2Url: string;
  fileName: string;
  key: string;
}

// Extract file key from UploadThing URL
// URLs can be: https://hcm3k9cha8.ufs.sh/f/dQiGkNU3GqIJ... or https://utfs.io/f/dQiGkNU3GqIJ...
function extractFileKey(url: string): string | null {
  try {
    // Match patterns like /f/dQiGkNU3GqIJ... or /f/dQiGkNU3GqIJ...?query
    const match = url.match(/\/f\/([a-zA-Z0-9]+)/);
    if (match && match[1]) {
      return match[1];
    }
    // Also try to match utfs.io pattern
    const utfsMatch = url.match(/utfs\.io\/f\/([a-zA-Z0-9]+)/);
    if (utfsMatch && utfsMatch[1]) {
      return utfsMatch[1];
    }
    return null;
  } catch {
    return null;
  }
}

// Load mapping - create both URL-based and key-based mappings
function loadMapping(): { urlMap: Map<string, string>; keyMap: Map<string, string> } {
  const urlMap = new Map<string, string>();
  const keyMap = new Map<string, string>();
  
  if (!fs.existsSync(MAPPING_FILE)) {
    console.error(`Error: Mapping file not found: ${MAPPING_FILE}`);
    console.error("Please run 'npm run upload-to-r2' first to create the mapping file.");
    process.exit(1);
  }

  try {
    const content = fs.readFileSync(MAPPING_FILE, "utf-8");
    const data: FileMapping[] = JSON.parse(content);
    data.forEach((item) => {
      // Store URL-based mapping
      urlMap.set(item.uploadthingUrl, item.r2Url);
      
      // Extract and store key-based mapping
      const fileKey = extractFileKey(item.uploadthingUrl);
      if (fileKey) {
        keyMap.set(fileKey, item.r2Url);
      }
    });
    console.log(`Loaded ${urlMap.size} URL mappings`);
    console.log(`Created ${keyMap.size} key-based mappings\n`);
  } catch (error) {
    console.error("Error loading mapping file:", error);
    process.exit(1);
  }
  
  return { urlMap, keyMap };
}

// Replace URL in a string
function replaceUrl(text: string | null, urlMap: Map<string, string>, keyMap: Map<string, string>): string | null {
  if (!text) return text;
  
  // First try exact URL match
  for (const [uploadthingUrl, r2Url] of urlMap.entries()) {
    if (text.includes(uploadthingUrl)) {
      return text.replace(new RegExp(uploadthingUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), r2Url);
    }
  }
  
  // If no exact match, try key-based matching
  const fileKey = extractFileKey(text);
  if (fileKey && keyMap.has(fileKey)) {
    // Replace the entire UploadThing URL with R2 URL
    // Match any UploadThing domain pattern
    const uploadThingPattern = /https?:\/\/[^\/]+\/f\/[a-zA-Z0-9]+(?:\?[^"'\s]*)?/g;
    return text.replace(uploadThingPattern, (match) => {
      const key = extractFileKey(match);
      return key && keyMap.has(key) ? keyMap.get(key)! : match;
    });
  }
  
  return text;
}

async function main() {
  console.log("Starting database URL migration from UploadThing to R2...\n");

  const { urlMap, keyMap } = loadMapping();

  if (urlMap.size === 0) {
    console.error("No mappings found. Please run 'npm run upload-to-r2' first.");
    process.exit(1);
  }

  let totalUpdated = 0;
  let totalSkipped = 0;

  try {
    // 1. Update User.image
    console.log("Updating User.image...");
    const users = await prisma.user.findMany({
      where: {
        image: { not: null },
      },
      select: { id: true, image: true },
    });

    for (const user of users) {
      if (user.image) {
        const newUrl = replaceUrl(user.image, urlMap, keyMap);
        if (newUrl !== user.image) {
          await prisma.user.update({
            where: { id: user.id },
            data: { image: newUrl },
          });
          totalUpdated++;
        } else {
          totalSkipped++;
        }
      }
    }
    console.log(`  Updated ${users.length} users\n`);

    // 2. Update Course.imageUrl
    console.log("Updating Course.imageUrl...");
    const courses = await prisma.course.findMany({
      where: {
        imageUrl: { not: null },
      },
      select: { id: true, imageUrl: true },
    });

    for (const course of courses) {
      if (course.imageUrl) {
        const newUrl = replaceUrl(course.imageUrl, urlMap, keyMap);
        if (newUrl !== course.imageUrl) {
          await prisma.course.update({
            where: { id: course.id },
            data: { imageUrl: newUrl },
          });
          totalUpdated++;
        } else {
          totalSkipped++;
        }
      }
    }
    console.log(`  Updated ${courses.length} courses\n`);

    // 3. Update Attachment.url
    console.log("Updating Attachment.url...");
    const attachments = await prisma.attachment.findMany({
      select: { id: true, url: true },
    });

    for (const attachment of attachments) {
      const newUrl = replaceUrl(attachment.url, urlMap, keyMap);
      if (newUrl !== attachment.url) {
        await prisma.attachment.update({
          where: { id: attachment.id },
          data: { url: newUrl },
        });
        totalUpdated++;
      } else {
        totalSkipped++;
      }
    }
    console.log(`  Updated ${attachments.length} attachments\n`);

    // 4. Update Chapter.videoUrl
    console.log("Updating Chapter.videoUrl...");
    const chapters = await prisma.chapter.findMany({
      where: {
        videoUrl: { not: null },
      },
      select: { id: true, videoUrl: true },
    });

    for (const chapter of chapters) {
      if (chapter.videoUrl) {
        const newUrl = replaceUrl(chapter.videoUrl, urlMap, keyMap);
        if (newUrl !== chapter.videoUrl) {
          await prisma.chapter.update({
            where: { id: chapter.id },
            data: { videoUrl: newUrl },
          });
          totalUpdated++;
        } else {
          totalSkipped++;
        }
      }
    }
    console.log(`  Updated ${chapters.length} chapters\n`);

    // 5. Update Chapter.documentUrl
    console.log("Updating Chapter.documentUrl...");
    const chaptersWithDocs = await prisma.chapter.findMany({
      where: {
        documentUrl: { not: null },
      },
      select: { id: true, documentUrl: true },
    });

    for (const chapter of chaptersWithDocs) {
      if (chapter.documentUrl) {
        const newUrl = replaceUrl(chapter.documentUrl, urlMap, keyMap);
        if (newUrl !== chapter.documentUrl) {
          await prisma.chapter.update({
            where: { id: chapter.id },
            data: { documentUrl: newUrl },
          });
          totalUpdated++;
        } else {
          totalSkipped++;
        }
      }
    }
    console.log(`  Updated ${chaptersWithDocs.length} chapter documents\n`);

    // 6. Update ChapterAttachment.url
    console.log("Updating ChapterAttachment.url...");
    const chapterAttachments = await prisma.chapterAttachment.findMany({
      select: { id: true, url: true },
    });

    for (const attachment of chapterAttachments) {
      const newUrl = replaceUrl(attachment.url, urlMap, keyMap);
      if (newUrl !== attachment.url) {
        await prisma.chapterAttachment.update({
          where: { id: attachment.id },
          data: { url: newUrl },
        });
        totalUpdated++;
      } else {
        totalSkipped++;
      }
    }
    console.log(`  Updated ${chapterAttachments.length} chapter attachments\n`);

    // 7. Update Question.imageUrl
    console.log("Updating Question.imageUrl...");
    const questions = await prisma.question.findMany({
      where: {
        imageUrl: { not: null },
      },
      select: { id: true, imageUrl: true },
    });

    for (const question of questions) {
      if (question.imageUrl) {
        const newUrl = replaceUrl(question.imageUrl, urlMap, keyMap);
        if (newUrl !== question.imageUrl) {
          await prisma.question.update({
            where: { id: question.id },
            data: { imageUrl: newUrl },
          });
          totalUpdated++;
        } else {
          totalSkipped++;
        }
      }
    }
    console.log(`  Updated ${questions.length} questions\n`);

    // 8. Update HomeworkSubmission.imageUrl and correctedImageUrl
    console.log("Updating HomeworkSubmission.imageUrl and correctedImageUrl...");
    const homeworkSubmissions = await prisma.homeworkSubmission.findMany({
      select: { id: true, imageUrl: true, correctedImageUrl: true },
    });

    for (const submission of homeworkSubmissions) {
      let needsUpdate = false;
      const updateData: { imageUrl?: string; correctedImageUrl?: string | null } = {};

      if (submission.imageUrl) {
        const newUrl = replaceUrl(submission.imageUrl, urlMap, keyMap);
        if (newUrl !== submission.imageUrl) {
          updateData.imageUrl = newUrl;
          needsUpdate = true;
          totalUpdated++;
        } else {
          totalSkipped++;
        }
      }

      if (submission.correctedImageUrl) {
        const newUrl = replaceUrl(submission.correctedImageUrl, urlMap, keyMap);
        if (newUrl !== submission.correctedImageUrl) {
          updateData.correctedImageUrl = newUrl;
          needsUpdate = true;
          totalUpdated++;
        } else {
          totalSkipped++;
        }
      }

      if (needsUpdate) {
        await prisma.homeworkSubmission.update({
          where: { id: submission.id },
          data: updateData,
        });
      }
    }
    console.log(`  Updated ${homeworkSubmissions.length} homework submissions\n`);

    // 9. Update ActivitySubmission.imageUrl
    console.log("Updating ActivitySubmission.imageUrl...");
    const activitySubmissions = await prisma.activitySubmission.findMany({
      select: { id: true, imageUrl: true },
    });

    for (const submission of activitySubmissions) {
      const newUrl = replaceUrl(submission.imageUrl, urlMap, keyMap);
      if (newUrl !== submission.imageUrl) {
        await prisma.activitySubmission.update({
          where: { id: submission.id },
          data: { imageUrl: newUrl },
        });
        totalUpdated++;
      } else {
        totalSkipped++;
      }
    }
    console.log(`  Updated ${activitySubmissions.length} activity submissions\n`);

    // 10. Update Certificate.imageUrl
    console.log("Updating Certificate.imageUrl...");
    const certificates = await prisma.certificate.findMany({
      select: { id: true, imageUrl: true },
    });

    for (const certificate of certificates) {
      const newUrl = replaceUrl(certificate.imageUrl, urlMap, keyMap);
      if (newUrl !== certificate.imageUrl) {
        await prisma.certificate.update({
          where: { id: certificate.id },
          data: { imageUrl: newUrl },
        });
        totalUpdated++;
      } else {
        totalSkipped++;
      }
    }
    console.log(`  Updated ${certificates.length} certificates\n`);

    // 11. Update Timetable.imageUrl
    console.log("Updating Timetable.imageUrl...");
    const timetables = await prisma.timetable.findMany({
      select: { id: true, imageUrl: true },
    });

    for (const timetable of timetables) {
      const newUrl = replaceUrl(timetable.imageUrl, urlMap, keyMap);
      if (newUrl !== timetable.imageUrl) {
        await prisma.timetable.update({
          where: { id: timetable.id },
          data: { imageUrl: newUrl },
        });
        totalUpdated++;
      } else {
        totalSkipped++;
      }
    }
    console.log(`  Updated ${timetables.length} timetables\n`);

    // 12. Update SubscriptionRequest.transactionImage
    console.log("Updating SubscriptionRequest.transactionImage...");
    const subscriptionRequests = await prisma.subscriptionRequest.findMany({
      select: { id: true, transactionImage: true },
    });

    for (const request of subscriptionRequests) {
      const newUrl = replaceUrl(request.transactionImage, urlMap, keyMap);
      if (newUrl !== request.transactionImage) {
        await prisma.subscriptionRequest.update({
          where: { id: request.id },
          data: { transactionImage: newUrl },
        });
        totalUpdated++;
      } else {
        totalSkipped++;
      }
    }
    console.log(`  Updated ${subscriptionRequests.length} subscription requests\n`);

    console.log("\n" + "=".repeat(50));
    console.log("Migration Summary:");
    console.log(`Total URLs updated: ${totalUpdated}`);
    console.log(`Total URLs skipped (no match): ${totalSkipped}`);
    console.log("=".repeat(50));

  } catch (error) {
    console.error("Error during migration:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});


