"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";

interface FileUploadProps {
    onChange: (res?: { url: string; name: string }) => void;
    endpoint: "courseImage" | "courseAttachment" | "chapterVideo" | "homeworkImage" | "activityImage" | "certificateImage" | "transactionImage" | "timetableImage";
}

// Map endpoints to R2 folders and file types
const endpointConfig: Record<string, { folder: string; accept: string; maxSize: number }> = {
    courseImage: { folder: "images", accept: "image/*", maxSize: 4 },
    courseAttachment: { folder: "documents", accept: "*", maxSize: 100 },
    chapterVideo: { folder: "videos", accept: "video/*", maxSize: 512000 }, // 512GB in MB
    homeworkImage: { folder: "images", accept: "image/*", maxSize: 8 },
    activityImage: { folder: "images", accept: "image/*", maxSize: 8 },
    certificateImage: { folder: "images", accept: "image/*", maxSize: 8 },
    transactionImage: { folder: "images", accept: "image/*", maxSize: 8 },
    timetableImage: { folder: "images", accept: "image/*", maxSize: 8 },
};

export const FileUpload = ({
    onChange,
    endpoint,
}: FileUploadProps) => {
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [preview, setPreview] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [fileName, setFileName] = useState<string>("");
    const [uploadedBytes, setUploadedBytes] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dropZoneRef = useRef<HTMLDivElement>(null);

    const config = endpointConfig[endpoint] || { folder: "files", accept: "*", maxSize: 8 };

    const uploadFile = async (file: File) => {
        // Check file size
        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > config.maxSize) {
            toast.error(`File size must be less than ${config.maxSize}MB`);
            return;
        }

        setUploading(true);
        setUploadProgress(0);
        setUploadedBytes(0);
        setPreview(null);
        setFileName(file.name);

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("folder", config.folder);

            // Use fetch with Server-Sent Events for real progress tracking
            const response = await fetch("/api/r2/upload", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.statusText}`);
            }

            if (!response.body) {
                throw new Error("No response body");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let lastReceivedProgress = 0;
            let lastUpdateTime = Date.now();

            // Set up a progress heartbeat to smooth out updates
            const progressHeartbeat = setInterval(() => {
                const now = Date.now();
                // If we haven't received an update in 300ms and progress is stuck, gradually increase
                if (now - lastUpdateTime > 300 && lastReceivedProgress < 95 && lastReceivedProgress > 0) {
                    const incrementalProgress = Math.min(95, lastReceivedProgress + 2);
                    if (incrementalProgress > uploadProgress) {
                        setUploadProgress(incrementalProgress);
                    }
                }
            }, 300);

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split("\n\n");
                    buffer = lines.pop() || "";

                    for (const line of lines) {
                        if (line.startsWith("data: ")) {
                            try {
                                const data = JSON.parse(line.slice(6));
                                
                                if (data.progress !== undefined) {
                                    // Update progress from R2 upload
                                    lastReceivedProgress = data.progress;
                                    lastUpdateTime = Date.now();
                                    setUploadProgress(data.progress);
                                } else if (data.done) {
                                    // Upload completed
                                    clearInterval(progressHeartbeat);
                                    setUploadProgress(100);
                                    onChange({
                                        url: data.url,
                                        name: data.name,
                                    });

                                    // Set preview for images
                                    if (file.type.startsWith("image/")) {
                                        setPreview(data.url);
                                    }

                                    toast.success("File uploaded successfully!");
                                } else if (data.error) {
                                    clearInterval(progressHeartbeat);
                                    throw new Error(data.error);
                                }
                            } catch (parseError) {
                                console.error("[PARSE_ERROR]", parseError);
                            }
                        }
                    }
                }
            } finally {
                clearInterval(progressHeartbeat);
            }
        } catch (error: any) {
            console.error("[R2_UPLOAD_ERROR]", error);
            
            // Don't show error toast if upload was cancelled
            if (!axios.isCancel(error)) {
                toast.error(error.response?.data?.error || "Failed to upload file");
            }
            
            setUploadProgress(0);
            setUploadedBytes(0);
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
            // Reset progress after a short delay
            setTimeout(() => {
                setUploadProgress(0);
                setUploadedBytes(0);
                setFileName("");
            }, 1000);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await uploadFile(file);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files?.[0];
        if (!file) return;

        await uploadFile(file);
    };

    const handleRemove = () => {
        setPreview(null);
        onChange(undefined);
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
                        disabled={uploading}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            ) : (
                <div
                    ref={dropZoneRef}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
                        isDragging
                            ? "border-primary bg-primary/5"
                            : "border-gray-300 dark:border-gray-700"
                    }`}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        id={`file-upload-${endpoint}`}
                        accept={config.accept}
                        onChange={handleFileSelect}
                        disabled={uploading}
                        className="hidden"
                    />
                    <label
                        htmlFor={`file-upload-${endpoint}`}
                        className="flex flex-col items-center justify-center cursor-pointer w-full"
                    >
                        {uploading ? (
                            <div className="w-full space-y-3">
                                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                                <div className="w-full space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground truncate max-w-[200px]">
                                            {fileName || "Uploading..."}
                                        </span>
                                        <span className="text-muted-foreground font-medium whitespace-nowrap ml-2">
                                            {uploadProgress}%
                                        </span>
                                    </div>
                                    <Progress 
                                        value={uploadProgress} 
                                        className="h-2"
                                    />
                                    {uploadProgress > 0 && uploadProgress < 100 && (
                                        <p className="text-xs text-muted-foreground text-center">
                                            Uploading to Cloudflare R2...
                                        </p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <>
                                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">
                                    Click to upload or drag and drop
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Max size: {config.maxSize}MB
                                </p>
                            </>
                        )}
                    </label>
                </div>
            )}
        </div>
    );
}