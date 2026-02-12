import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { uploadToR2, fileExistsInR2, generateR2Key } from "../lib/r2/upload";
import { R2_BUCKET_NAME, R2_PUBLIC_URL } from "../lib/r2/config";

const LOCAL_FILES_DIR = "E:\\uploadthing-files\\mhm-academy";
const MAPPING_FILE = path.join(process.cwd(), "scripts", "uploadthing-to-r2-mapping.json");

interface FileMapping {
  uploadthingUrl: string;
  r2Url: string;
  fileName: string;
  key: string;
}

// Load existing mapping if it exists
function loadMapping(): Map<string, FileMapping> {
  const mapping = new Map<string, FileMapping>();
  
  if (fs.existsSync(MAPPING_FILE)) {
    try {
      const content = fs.readFileSync(MAPPING_FILE, "utf-8");
      const data: FileMapping[] = JSON.parse(content);
      data.forEach((item) => {
        mapping.set(item.uploadthingUrl, item);
      });
      console.log(`Loaded ${mapping.size} existing mappings`);
    } catch (error) {
      console.error("Error loading mapping file:", error);
    }
  }
  
  return mapping;
}

// Save mapping to file
function saveMapping(mapping: Map<string, FileMapping>) {
  const data = Array.from(mapping.values());
  fs.writeFileSync(MAPPING_FILE, JSON.stringify(data, null, 2));
  console.log(`Saved ${data.length} mappings to ${MAPPING_FILE}`);
}

// Extract UploadThing URL from JSON files
function extractUploadThingUrls(): Map<string, string> {
  const urlToFileName = new Map<string, string>();
  const jsonFiles = [
    "selected-rows-1.json",
    "selected-rows-2.json",
    "selected-rows-3.json",
  ];

  for (const jsonFile of jsonFiles) {
    const filePath = path.join(process.cwd(), jsonFile);
    if (!fs.existsSync(filePath)) {
      console.warn(`Warning: ${jsonFile} not found, skipping...`);
      continue;
    }

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const entries: Array<{ url: string; name: string; key: string }> = JSON.parse(content);
      
      entries.forEach((entry) => {
        urlToFileName.set(entry.url, entry.name);
      });
      
      console.log(`Loaded ${entries.length} entries from ${jsonFile}`);
    } catch (error) {
      console.error(`Error reading ${jsonFile}:`, error);
    }
  }

  return urlToFileName;
}

// Determine folder based on file type
function getFolderForFile(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  
  if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)) {
    return "images";
  } else if ([".mp4", ".webm", ".mov"].includes(ext)) {
    return "videos";
  } else if ([".pdf", ".doc", ".docx"].includes(ext)) {
    return "documents";
  } else if ([".mp3", ".wav", ".ogg"].includes(ext)) {
    return "audio";
  }
  
  return "files";
}

async function main() {
  console.log("Starting R2 upload process...\n");

  if (!R2_BUCKET_NAME || !R2_PUBLIC_URL) {
    console.error("Error: R2_BUCKET_NAME and R2_PUBLIC_URL must be set in environment variables!");
    process.exit(1);
  }

  // Load existing mapping
  const mapping = loadMapping();
  
  // Extract UploadThing URLs from JSON files
  const urlToFileName = extractUploadThingUrls();
  console.log(`\nTotal UploadThing URLs found: ${urlToFileName.size}\n`);

  // Get all local files
  if (!fs.existsSync(LOCAL_FILES_DIR)) {
    console.error(`Error: Local files directory not found: ${LOCAL_FILES_DIR}`);
    process.exit(1);
  }

  const localFiles = fs.readdirSync(LOCAL_FILES_DIR);
  console.log(`Found ${localFiles.length} local files\n`);

  let uploadedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  // Process each file
  for (let i = 0; i < localFiles.length; i++) {
    const fileName = localFiles[i];
    const filePath = path.join(LOCAL_FILES_DIR, fileName);

    // Skip if not a file
    if (!fs.statSync(filePath).isFile()) {
      continue;
    }

    // Find matching UploadThing URL
    let uploadThingUrl: string | undefined;
    for (const [url, mappedFileName] of urlToFileName.entries()) {
      // Check exact match or match with key suffix
      if (mappedFileName === fileName || fileName.startsWith(mappedFileName.replace(/\.[^.]+$/, ""))) {
        uploadThingUrl = url;
        break;
      }
    }

    // If already mapped, skip
    if (uploadThingUrl && mapping.has(uploadThingUrl)) {
      console.log(`[${i + 1}/${localFiles.length}] Skipping ${fileName} (already uploaded)`);
      skippedCount++;
      continue;
    }

    try {
      console.log(`[${i + 1}/${localFiles.length}] Uploading ${fileName}...`);

      const folder = getFolderForFile(fileName);
      const key = generateR2Key(fileName, folder);

      // Check if file already exists in R2
      if (await fileExistsInR2(key)) {
        const r2Url = R2_PUBLIC_URL.endsWith("/")
          ? `${R2_PUBLIC_URL}${key}`
          : `${R2_PUBLIC_URL}/${key}`;
        
        if (uploadThingUrl) {
          mapping.set(uploadThingUrl, {
            uploadthingUrl: uploadThingUrl,
            r2Url,
            fileName,
            key,
          });
        }
        
        console.log(`[${i + 1}/${localFiles.length}] ✓ File already exists in R2: ${fileName}`);
        skippedCount++;
        continue;
      }

      // Upload to R2
      const r2Url = await uploadToR2(filePath, key);

      // Save mapping
      if (uploadThingUrl) {
        mapping.set(uploadThingUrl, {
          uploadthingUrl: uploadThingUrl,
          r2Url,
          fileName,
          key,
        });
      }

      console.log(`[${i + 1}/${localFiles.length}] ✓ Uploaded ${fileName}`);
      uploadedCount++;

      // Save mapping periodically
      if ((i + 1) % 50 === 0) {
        saveMapping(mapping);
      }
    } catch (error: any) {
      console.error(`[${i + 1}/${localFiles.length}] ✗ Error uploading ${fileName}:`, error.message);
      errorCount++;
    }
  }

  // Final save
  saveMapping(mapping);

  console.log("\n" + "=".repeat(50));
  console.log("Upload Summary:");
  console.log(`Total files processed: ${localFiles.length}`);
  console.log(`Successfully uploaded: ${uploadedCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Total mappings: ${mapping.size}`);
  console.log("=".repeat(50));
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

