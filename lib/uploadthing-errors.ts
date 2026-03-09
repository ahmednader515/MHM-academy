/**
 * User-friendly messages for UploadThing errors.
 * Use with the errorFormatter in lib/uploadthing/core.ts so error.data contains { code, message }.
 */

export type UploadThingErrorCode =
    | "FORBIDDEN"
    | "BAD_REQUEST"
    | "TOO_LARGE"
    | "TOO_SMALL"
    | "TOO_MANY_FILES"
    | "KEY_TOO_LONG"
    | "UPLOAD_FAILED"
    | "URL_GENERATION_FAILED"
    | "MISSING_ENV"
    | "FILE_LIMIT_EXCEEDED"
    | "INTERNAL_SERVER_ERROR"
    | "INTERNAL_CLIENT_ERROR"
    | "NOT_FOUND";

export interface UploadThingErrorData {
    code?: UploadThingErrorCode | string;
    message?: string;
}

export interface UploadThingClientError extends Error {
    data?: UploadThingErrorData;
}

const DEFAULT_MESSAGES: Record<UploadThingErrorCode | string, string> = {
    FORBIDDEN: "Please log in to upload files. Your session may have expired.",
    BAD_REQUEST: "Invalid request. Check the file type and try again.",
    TOO_LARGE: "File is too large. Please choose a smaller file.",
    TOO_SMALL: "File is too small or invalid.",
    TOO_MANY_FILES: "Too many files. Please upload one at a time.",
    KEY_TOO_LONG: "File name is too long. Please shorten it.",
    UPLOAD_FAILED: "Upload failed. Please check your connection and try again.",
    URL_GENERATION_FAILED: "Could not prepare upload. Please try again.",
    MISSING_ENV: "Upload service is not configured. Please try again later.",
    FILE_LIMIT_EXCEEDED: "File limit exceeded. Please choose a smaller file or different type.",
    INTERNAL_SERVER_ERROR: "Something went wrong. Please try again.",
    INTERNAL_CLIENT_ERROR: "Something went wrong. Please try again.",
    NOT_FOUND: "Upload not found. Please try again.",
};

/**
 * Returns a user-friendly message for an UploadThing upload error.
 * Pass optional t() from useLanguage for localized messages (keys under common.uploadError.*).
 */
export function getUploadErrorMessage(
    error: UploadThingClientError | Error,
    t?: (key: string) => string
): string {
    const data = (error as UploadThingClientError).data;
    const code = data?.code as UploadThingErrorCode | undefined;
    const serverMessage = data?.message ?? error.message;

    if (t) {
        const key = `common.uploadError.${code ?? "default"}`;
        const translated = t(key);
        if (translated && translated !== key) return translated;
    }

    if (code && DEFAULT_MESSAGES[code]) return DEFAULT_MESSAGES[code];

    if (serverMessage && serverMessage !== "Failed to run middleware" && serverMessage !== "An unknown error occurred") {
        return serverMessage;
    }

    return DEFAULT_MESSAGES.INTERNAL_SERVER_ERROR;
}
