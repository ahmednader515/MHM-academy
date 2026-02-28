import { auth } from "@/lib/auth";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

// Verify UploadThing environment variables are set
if (!process.env.UPLOADTHING_SECRET) {
    console.error("[UPLOADTHING] UPLOADTHING_SECRET is not set in environment variables!");
}
if (!process.env.UPLOADTHING_APP_ID) {
    console.error("[UPLOADTHING] UPLOADTHING_APP_ID is not set in environment variables!");
}

const f = createUploadthing();

const handleAuth = async () => {
    const session = await auth();
    
    if (!session?.user?.id || !session?.user) {
        throw new UploadThingError({
            message: "Unauthorized - Please log in to upload files",
            code: "FORBIDDEN",
        });
    }
    
    return { userId: session.user.id };
}

export const ourFileRouter = {
    courseImage: f({ image: {maxFileSize: "4MB", maxFileCount: 1} })
    .middleware(() => handleAuth())
    .onUploadComplete(() => {}),

    courseAttachment: f(["text", "image", "video", "audio", "pdf"])
    .middleware(() => handleAuth())
    .onUploadComplete(async ({ file }) => {
        return { url: file.url, name: file.name };
    }),

    homeworkImage: f({ image: {maxFileSize: "8MB", maxFileCount: 1} })
    .middleware(() => handleAuth())
    .onUploadComplete(async ({ file }) => {
        return { url: file.url, name: file.name };
    }),

    activityImage: f({ image: {maxFileSize: "8MB", maxFileCount: 1} })
    .middleware(() => handleAuth())
    .onUploadComplete(async ({ file }) => {
        return { url: file.url, name: file.name };
    }),

    certificateImage: f({ image: {maxFileSize: "8MB", maxFileCount: 1} })
    .middleware(() => handleAuth())
    .onUploadComplete(async ({ file }) => {
        return { url: file.url, name: file.name };
    }),

    transactionImage: f({ image: {maxFileSize: "8MB", maxFileCount: 1} })
    .middleware(() => handleAuth())
    .onUploadComplete(async ({ file }) => {
        return { url: file.url, name: file.name };
    }),

    timetableImage: f({ image: {maxFileSize: "8MB", maxFileCount: 1} })
    .middleware(() => handleAuth())
    .onUploadComplete(async ({ file }) => {
        return { url: file.url, name: file.name };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
