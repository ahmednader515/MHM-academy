import "dotenv/config";
import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET_NAME } from "../lib/r2/config";

/**
 * Script to configure CORS for R2 bucket to allow video playback
 * Run this once to set up CORS: npm run setup-r2-cors
 */
async function setupCORS() {
  if (!R2_BUCKET_NAME) {
    console.error("Error: R2_BUCKET_NAME is not set in environment variables!");
    process.exit(1);
  }

  try {
    console.log(`Setting up CORS for bucket: ${R2_BUCKET_NAME}\n`);

    const command = new PutBucketCorsCommand({
      Bucket: R2_BUCKET_NAME,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ["*"],
            AllowedMethods: ["GET", "HEAD"],
            AllowedOrigins: ["*"], // In production, replace with your domain
            ExposeHeaders: [
              "ETag",
              "Content-Length",
              "Content-Type",
              "Accept-Ranges",
              "Content-Range",
            ],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    });

    await r2Client.send(command);
    console.log("✅ CORS configuration applied successfully!");
    console.log("\nCORS Rules:");
    console.log("  - Allowed Methods: GET, HEAD");
    console.log("  - Allowed Origins: * (all origins)");
    console.log("  - Allowed Headers: * (all headers)");
    console.log("  - Exposed Headers: ETag, Content-Length, Content-Type, Accept-Ranges, Content-Range");
    console.log("\n⚠️  Note: In production, consider restricting AllowedOrigins to your domain only.");
  } catch (error: any) {
    console.error("❌ Error setting up CORS:", error);
    console.error("\nError details:", {
      name: error.name,
      message: error.message,
      code: error.Code,
    });
    process.exit(1);
  }
}

setupCORS();

