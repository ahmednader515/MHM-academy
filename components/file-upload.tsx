"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, X } from "lucide-react";
import toast from "react-hot-toast";
import { useLanguage } from "@/lib/contexts/language-context";
import type { UploadEndpoint } from "@/lib/s3";

interface FileUploadProps {
    onChange: (res?: { url: string; name: string }) => void;
    endpoint: UploadEndpoint;
}

const endpointConfig: Record<UploadEndpoint, { accept: string; helperText: string }> = {
    courseImage: {
        accept: "image/*",
        helperText: "PNG, JPG, WEBP, or other image formats up to 4MB.",
    },
    courseAttachment: {
        accept: "image/*,video/*,audio/*,text/*,.pdf,application/pdf",
        helperText: "Images, videos, audio, text files, and PDFs up to 512MB.",
    },
    homeworkImage: {
        accept: "image/*",
        helperText: "Image files up to 10MB.",
    },
    activityImage: {
        accept: "image/*",
        helperText: "Image files up to 10MB.",
    },
    certificateImage: {
        accept: "image/*",
        helperText: "Image files up to 10MB.",
    },
    transactionImage: {
        accept: "image/*",
        helperText: "Image files up to 10MB.",
    },
    timetableImage: {
        accept: "image/*",
        helperText: "Image files up to 10MB.",
    },
};

export const FileUpload = ({
    onChange,
    endpoint,
}: FileUploadProps) => {
    const { t } = useLanguage();
    const [preview, setPreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleRemove = () => {
        setPreview(null);
        onChange(undefined);
    };

    const uploadFile = async (file: File) => {
        setIsUploading(true);

        try {
            const presignResponse = await fetch("/api/uploads/s3", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    endpoint,
                    fileName: file.name,
                    fileType: file.type,
                    fileSize: file.size,
                }),
            });

            if (!presignResponse.ok) {
                throw new Error(await presignResponse.text());
            }

            const { uploadUrl, publicUrl } = await presignResponse.json();

            const uploadResponse = await fetch(uploadUrl, {
                method: "PUT",
                headers: {
                    "Content-Type": file.type || "application/octet-stream",
                },
                body: file,
            });

            if (!uploadResponse.ok) {
                throw new Error("Upload failed while sending the file to Amazon S3.");
            }

            onChange({
                url: publicUrl,
                name: file.name,
            });

            if (file.type.startsWith("image/")) {
                setPreview(publicUrl);
            }

            toast.success("File uploaded successfully!");
        } catch (error) {
            console.error("[S3_UPLOAD_ERROR]", error);
            const message = error instanceof Error ? error.message : t("common.error");
            toast.error(message);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="space-y-2">
            {preview ? (
                <div className="relative">
                    <img
                        src={preview}
                        alt="Preview"
                        className="w-full h-auto rounded-md border max-h-64 object-contain"
                    />
                    <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={handleRemove}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-muted-foreground/40 px-6 py-8 text-center transition hover:border-primary/60 hover:bg-muted/40">
                    <input
                        type="file"
                        className="hidden"
                        accept={endpointConfig[endpoint].accept}
                        disabled={isUploading}
                        onChange={(event) => {
                            const file = event.target.files?.[0];

                            if (file) {
                                void uploadFile(file);
                            }

                            event.target.value = "";
                        }}
                    />
                    {isUploading ? (
                        <Loader2 className="mb-2 h-6 w-6 animate-spin" />
                    ) : (
                        <Upload className="mb-2 h-6 w-6" />
                    )}
                    <div className="text-sm font-medium">
                        {isUploading ? "Uploading..." : "Click to choose a file"}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                        {endpointConfig[endpoint].helperText}
                    </div>
                </label>
            )}
        </div>
    );
}
