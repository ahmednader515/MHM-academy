import { auth } from "@/lib/auth";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

const f = createUploadthing();

const handleAuth = async () => {
    const session = await auth();
    if (!session?.user?.id || !session?.user) {
        throw new UploadThingError("Unauthorized");
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

    chapterVideo: f({ video: {maxFileCount: 1, maxFileSize: "512GB"} })
    .middleware(() => handleAuth())
    .onUploadComplete(() => {}),

    homeworkImage: f({ image: {maxFileSize: "10MB", maxFileCount: 1} })
    .middleware(() => handleAuth())
    .onUploadComplete(async ({ file }) => {
        return { url: file.url, name: file.name };
    }),

    activityImage: f({ image: {maxFileSize: "10MB", maxFileCount: 1} })
    .middleware(() => handleAuth())
    .onUploadComplete(async ({ file }) => {
        return { url: file.url, name: file.name };
    }),

    certificateImage: f({ image: {maxFileSize: "10MB", maxFileCount: 1} })
    .middleware(() => handleAuth())
    .onUploadComplete(async ({ file }) => {
        return { url: file.url, name: file.name };
    }),

    transactionImage: f({ image: {maxFileSize: "10MB", maxFileCount: 1} })
    .middleware(() => handleAuth())
    .onUploadComplete(async ({ file }) => {
        return { url: file.url, name: file.name };
    }),

    timetableImage: f({ image: {maxFileSize: "10MB", maxFileCount: 1} })
    .middleware(() => handleAuth())
    .onUploadComplete(async ({ file }) => {
        return { url: file.url, name: file.name };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
