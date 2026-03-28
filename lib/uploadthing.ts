"use client";

import { createElement, type ReactNode } from "react";
import { FileUpload } from "@/components/file-upload";
import type { UploadEndpoint } from "@/lib/s3";

type UploadThingFile = {
  url: string;
  name: string;
};

type UploadThingProps = {
  endpoint: UploadEndpoint;
  onClientUploadComplete?: (files: UploadThingFile[]) => void | Promise<void>;
  onUploadError?: (error: Error) => void;
  onUploadBegin?: (fileName: string) => void;
  className?: string;
  content?: ReactNode;
};

function UploadThingCompat(props: UploadThingProps) {
  const { endpoint, onClientUploadComplete, onUploadError, onUploadBegin, className, content } = props;

  return createElement(
    "div",
    { className },
    createElement(FileUpload, {
      endpoint,
      onChange: async (result?: UploadThingFile) => {
        if (!result) {
          return;
        }

        try {
          onUploadBegin?.(result.name);
          await onClientUploadComplete?.([result]);
        } catch (error) {
          onUploadError?.(error instanceof Error ? error : new Error("Upload handling failed"));
        }
      },
    }),
    content ?? null
  );
}

export const UploadButton = UploadThingCompat;
export const UploadDropzone = UploadThingCompat;
