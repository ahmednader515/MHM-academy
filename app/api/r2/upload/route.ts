import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { Upload } from "@aws-sdk/lib-storage";
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "@/lib/r2/config";
import { generateR2Key } from "@/lib/r2/upload";

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();
  
  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const folder = formData.get("folder") as string | null;

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!R2_BUCKET_NAME || !R2_PUBLIC_URL) {
      return new Response(
        JSON.stringify({ error: "R2 bucket not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Generate R2 key
    const key = generateR2Key(file.name, folder || undefined);

    // Send initial progress (file received by server)
    const fileSize = file.size;
    const initialProgress = Math.min(10, Math.round((fileSize / fileSize) * 5)); // 5% for receiving file
    
    // Create a readable stream for Server-Sent Events
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial progress
          const initialData = JSON.stringify({ progress: initialProgress });
          controller.enqueue(encoder.encode(`data: ${initialData}\n\n`));

          // Convert file to buffer (this is fast, so we'll simulate progress)
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);
          
          // Send progress for buffer conversion (10%)
          const bufferProgress = JSON.stringify({ progress: 10 });
          controller.enqueue(encoder.encode(`data: ${bufferProgress}\n\n`));

          // Detect content type based on file extension if not provided
          let contentType = file.type;
          if (!contentType || contentType === "application/octet-stream") {
            const ext = file.name.toLowerCase().split('.').pop();
            const mimeTypes: Record<string, string> = {
              mp4: "video/mp4",
              webm: "video/webm",
              ogg: "video/ogg",
              mov: "video/quicktime",
              avi: "video/x-msvideo",
              mkv: "video/x-matroska",
            };
            contentType = mimeTypes[ext || ""] || "video/mp4";
          }

          // Use Upload class for progress tracking
          // R2 requires minimum 5MB part size for multipart uploads
          // For files smaller than 5MB, use single-part upload (no partSize specified)
          // For larger files, use 5MB parts for progress tracking
          const uploadParams: any = {
            client: r2Client,
            params: {
              Bucket: R2_BUCKET_NAME,
              Key: key,
              Body: buffer,
              ContentType: contentType,
              // Add cache control for videos
              CacheControl: "public, max-age=31536000, immutable",
            },
            queueSize: 1, // Upload one part at a time for sequential progress
          };

          // Only set partSize for files larger than 5MB (multipart upload)
          if (file.size > 5 * 1024 * 1024) {
            uploadParams.partSize = 5 * 1024 * 1024; // 5MB parts (minimum required)
          }

          const upload = new Upload(uploadParams);

          let lastProgress = 10;
          let lastUpdateTime = Date.now();
          let progressInterval: NodeJS.Timeout | null = null;
          let actualR2Progress = 0;

          // Track upload progress and send updates
          upload.on("httpUploadProgress", (progress) => {
            if (progress.loaded !== undefined && progress.total !== undefined && progress.total > 0) {
              actualR2Progress = (progress.loaded / progress.total) * 100;
              // Map R2 upload progress from 10% to 95%
              // (0-10% = file reception + buffer conversion, 10-95% = R2 upload)
              const percent = Math.min(95, Math.round(10 + (actualR2Progress * 0.85)));
              const now = Date.now();
              
              // Send update if progress increased or enough time has passed
              if (percent > lastProgress || (now - lastUpdateTime >= 150)) {
                lastProgress = Math.max(lastProgress, percent);
                lastUpdateTime = now;
                const progressData = JSON.stringify({ 
                  progress: percent, 
                  loaded: progress.loaded, 
                  total: progress.total 
                });
                controller.enqueue(encoder.encode(`data: ${progressData}\n\n`));
              }
            }
          });

          // Set up a heartbeat to ensure progress updates even if events are sparse
          // This helps for files that upload very quickly
          progressInterval = setInterval(() => {
            const now = Date.now();
            // If we have actual progress but haven't updated in a while, send update
            if (actualR2Progress > 0 && now - lastUpdateTime > 200 && lastProgress < 95) {
              const percent = Math.min(95, Math.round(10 + (actualR2Progress * 0.85)));
              if (percent > lastProgress) {
                lastProgress = percent;
                lastUpdateTime = now;
                const progressData = JSON.stringify({ 
                  progress: percent,
                  loaded: Math.round((actualR2Progress / 100) * buffer.length),
                  total: buffer.length
                });
                controller.enqueue(encoder.encode(`data: ${progressData}\n\n`));
              }
            }
          }, 200); // Every 200ms

          // Complete the upload
          await upload.done();
          
          // Clear heartbeat interval
          if (progressInterval) {
            clearInterval(progressInterval);
          }

          // Send completion
          const url = R2_PUBLIC_URL.endsWith("/")
            ? `${R2_PUBLIC_URL}${key}`
            : `${R2_PUBLIC_URL}/${key}`;

          const result = JSON.stringify({
            done: true,
            url,
            name: file.name,
            key,
          });
          controller.enqueue(encoder.encode(`data: ${result}\n\n`));
          controller.close();
        } catch (error: any) {
          console.error("[R2_UPLOAD_ERROR]", error);
          const errorData = JSON.stringify({
            error: error.message || "Failed to upload file",
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("[R2_UPLOAD_ERROR]", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to upload file" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

