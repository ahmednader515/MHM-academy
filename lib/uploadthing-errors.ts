export type UploadThingClientError = Error;

export function getUploadErrorMessage(error: UploadThingClientError, fallback?: (key: string) => string) {
  return error.message || fallback?.("common.error") || "Upload failed";
}
