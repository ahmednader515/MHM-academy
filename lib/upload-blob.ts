import type { UploadEndpoint } from "@/lib/s3";

export async function uploadBlobToS3(blob: Blob, fileName: string, endpoint: UploadEndpoint) {
    const presignResponse = await fetch("/api/uploads/s3", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            endpoint,
            fileName,
            fileType: blob.type || "image/jpeg",
            fileSize: blob.size,
        }),
    });

    if (!presignResponse.ok) {
        throw new Error(await presignResponse.text());
    }

    const { uploadUrl, publicUrl } = await presignResponse.json();

    const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
            "Content-Type": blob.type || "image/jpeg",
        },
        body: blob,
    });

    if (!uploadResponse.ok) {
        throw new Error("Upload failed while sending the file to Amazon S3.");
    }

    return publicUrl as string;
}
