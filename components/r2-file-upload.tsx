"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";

interface R2FileUploadProps {
  onChange: (res?: { url: string; name: string }) => void;
  folder?: string;
  accept?: string;
  maxSize?: number; // in MB
  disabled?: boolean;
}

export const R2FileUpload = ({
  onChange,
  folder,
  accept = "image/*",
  maxSize = 8,
  disabled = false,
}: R2FileUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSize) {
      toast.error(`File size must be less than ${maxSize}MB`);
      return;
    }

    setUploading(true);
    setPreview(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (folder) {
        formData.append("folder", folder);
      }

      const response = await axios.post("/api/r2/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.url) {
        onChange({
          url: response.data.url,
          name: response.data.name,
        });

        // Set preview for images
        if (file.type.startsWith("image/")) {
          setPreview(response.data.url);
        }

        toast.success("File uploaded successfully!");
      }
    } catch (error: any) {
      console.error("[R2_UPLOAD_ERROR]", error);
      toast.error(error.response?.data?.error || "Failed to upload file");
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = "";
    }
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
            disabled={disabled}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6">
          <input
            type="file"
            id="r2-file-upload"
            accept={accept}
            onChange={handleFileSelect}
            disabled={disabled || uploading}
            className="hidden"
          />
          <label
            htmlFor="r2-file-upload"
            className="flex flex-col items-center justify-center cursor-pointer"
          >
            {uploading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Uploading...</p>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Max size: {maxSize}MB
                </p>
              </>
            )}
          </label>
        </div>
      )}
    </div>
  );
};

