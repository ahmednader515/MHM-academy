"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UploadDropzone } from "@uploadthing/react";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { ourFileRouter } from "@/lib/uploadthing/core";
import type { OurFileRouter } from "@/lib/uploadthing/core";

interface FileUploadProps {
    onChange: (res?: { url: string; name: string }) => void;
    endpoint: "courseImage" | "courseAttachment" | "chapterVideo" | "homeworkImage" | "activityImage" | "certificateImage" | "transactionImage" | "timetableImage";
}

export const FileUpload = ({
    onChange,
    endpoint,
}: FileUploadProps) => {
    const [preview, setPreview] = useState<string | null>(null);
    const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
    const [uploadedName, setUploadedName] = useState<string | null>(null);

    const handleRemove = () => {
        setPreview(null);
        setUploadedUrl(null);
        setUploadedName(null);
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
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            ) : (
                <UploadDropzone<OurFileRouter>
                    endpoint={endpoint}
                    onClientUploadComplete={(res) => {
                        if (res && res[0]) {
                            const file = res[0];
                            onChange({
                                url: file.url,
                                name: file.name,
                            });
                            
                            // Set preview for images
                            if (file.url && (endpoint.includes("Image") || endpoint === "courseImage")) {
                                setPreview(file.url);
                            }
                            
                            setUploadedUrl(file.url);
                            setUploadedName(file.name);
                            toast.success("File uploaded successfully!");
                        }
                    }}
                    onUploadError={(error: Error) => {
                        console.error("[UPLOADTHING_ERROR]", error);
                        toast.error(error.message || "Failed to upload file");
                    }}
                />
            )}
        </div>
    );
}