import { PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "./config";
import * as fs from "fs";
import * as path from "path";

/**
 * Upload a file to R2
 * @param filePath Local file path
 * @param key R2 object key (path in bucket)
 * @param contentType MIME type
 * @returns Public URL of the uploaded file
 */
export async function uploadToR2(
  filePath: string,
  key: string,
  contentType?: string
): Promise<string> {
  if (!R2_BUCKET_NAME) {
    throw new Error("R2_BUCKET_NAME is not configured");
  }

  const fileContent = fs.readFileSync(filePath);
  
  // Detect content type if not provided
  if (!contentType) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".pdf": "application/pdf",
      ".mp4": "video/mp4",
      ".mp3": "audio/mpeg",
      ".webm": "video/webm",
      ".txt": "text/plain",
      ".json": "application/json",
    };
    contentType = mimeTypes[ext] || "application/octet-stream";
  }

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: fileContent,
    ContentType: contentType,
  });

  await r2Client.send(command);

  // Return public URL
  const publicUrl = R2_PUBLIC_URL.endsWith("/")
    ? `${R2_PUBLIC_URL}${key}`
    : `${R2_PUBLIC_URL}/${key}`;

  return publicUrl;
}

/**
 * Check if a file exists in R2
 */
export async function fileExistsInR2(key: string): Promise<boolean> {
  if (!R2_BUCKET_NAME) {
    return false;
  }

  try {
    const command = new HeadObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });
    await r2Client.send(command);
    return true;
  } catch (error: any) {
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * Generate a unique key for a file based on its original name
 */
export function generateR2Key(originalName: string, folder?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const key = folder
    ? `${folder}/${timestamp}-${random}-${sanitizedName}`
    : `${timestamp}-${random}-${sanitizedName}`;
  return key;
}

