import { randomUUID } from "crypto";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export type UploadEndpoint =
  | "courseImage"
  | "courseAttachment"
  | "homeworkImage"
  | "activityImage"
  | "certificateImage"
  | "transactionImage"
  | "timetableImage";

type UploadConfig = {
  maxFileSize: number;
  allowedMimeTypes: string[];
  keyPrefix: string;
};

const MB = 1024 * 1024;

export const uploadConfigs: Record<UploadEndpoint, UploadConfig> = {
  courseImage: {
    maxFileSize: 4 * MB,
    allowedMimeTypes: ["image/"],
    keyPrefix: "course-images",
  },
  courseAttachment: {
    maxFileSize: 512 * MB,
    allowedMimeTypes: ["image/", "video/", "audio/", "text/", "application/pdf"],
    keyPrefix: "course-attachments",
  },
  homeworkImage: {
    maxFileSize: 10 * MB,
    allowedMimeTypes: ["image/"],
    keyPrefix: "homework",
  },
  activityImage: {
    maxFileSize: 10 * MB,
    allowedMimeTypes: ["image/"],
    keyPrefix: "activities",
  },
  certificateImage: {
    maxFileSize: 10 * MB,
    allowedMimeTypes: ["image/"],
    keyPrefix: "certificates",
  },
  transactionImage: {
    maxFileSize: 10 * MB,
    allowedMimeTypes: ["image/"],
    keyPrefix: "transactions",
  },
  timetableImage: {
    maxFileSize: 10 * MB,
    allowedMimeTypes: ["image/"],
    keyPrefix: "timetables",
  },
};

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getS3Client() {
  return new S3Client({
    region: requireEnv("AWS_REGION"),
    credentials: {
      accessKeyId: requireEnv("AWS_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("AWS_SECRET_ACCESS_KEY"),
    },
  });
}

export function getBucketName() {
  return requireEnv("AWS_S3_BUCKET");
}

export function getPublicBaseUrl() {
  const configuredBaseUrl = process.env.AWS_S3_PUBLIC_BASE_URL?.trim();

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/, "");
  }

  const bucket = getBucketName();
  const region = requireEnv("AWS_REGION");

  return `https://${bucket}.s3.${region}.amazonaws.com`;
}

function matchesMimeType(fileType: string, acceptedType: string) {
  if (acceptedType.endsWith("/")) {
    return fileType.startsWith(acceptedType);
  }

  return fileType === acceptedType;
}

export function validateUploadInput(endpoint: UploadEndpoint, file: { size: number; type: string; name: string }) {
  const config = uploadConfigs[endpoint];

  if (!config) {
    throw new Error("Unsupported upload endpoint");
  }

  if (!file.name) {
    throw new Error("Missing file name");
  }

  if (file.size <= 0) {
    throw new Error("Empty files are not allowed");
  }

  if (file.size > config.maxFileSize) {
    throw new Error(`File is too large. Maximum size is ${Math.round(config.maxFileSize / MB)}MB`);
  }

  if (!file.type || !config.allowedMimeTypes.some((acceptedType) => matchesMimeType(file.type, acceptedType))) {
    throw new Error("This file type is not allowed");
  }
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^\w.\-() ]+/g, "_").replace(/\s+/g, "-");
}

export function buildObjectKey(endpoint: UploadEndpoint, fileName: string, userId: string) {
  const config = uploadConfigs[endpoint];
  const sanitizedFileName = sanitizeFileName(fileName);

  return `${config.keyPrefix}/${userId}/${Date.now()}-${randomUUID()}-${sanitizedFileName}`;
}

export async function createPresignedUpload(params: {
  endpoint: UploadEndpoint;
  fileName: string;
  fileType: string;
  userId: string;
}) {
  const { endpoint, fileName, fileType, userId } = params;
  const client = getS3Client();
  const bucket = getBucketName();
  const key = buildObjectKey(endpoint, fileName, userId);

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: fileType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });

  return {
    key,
    uploadUrl,
    publicUrl: `${getPublicBaseUrl()}/${key}`,
  };
}

export function extractS3KeyFromUrl(url: string | null | undefined) {
  if (!url) {
    return null;
  }

  const publicBaseUrl = getPublicBaseUrl();

  if (url.startsWith(`${publicBaseUrl}/`)) {
    return url.slice(publicBaseUrl.length + 1);
  }

  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.replace(/^\/+/, "");
    const bucket = getBucketName();

    if (parsed.hostname === new URL(publicBaseUrl).hostname) {
      return pathname;
    }

    if (parsed.hostname.startsWith(`${bucket}.s3.`) && parsed.hostname.endsWith(".amazonaws.com")) {
      return pathname;
    }
  } catch {
    return null;
  }

  return null;
}

export async function deleteS3ObjectByUrl(url: string | null | undefined) {
  const key = extractS3KeyFromUrl(url);

  if (!key) {
    return false;
  }

  const client = getS3Client();

  await client.send(
    new DeleteObjectCommand({
      Bucket: getBucketName(),
      Key: key,
    })
  );

  return true;
}
