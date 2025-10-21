import { PrismaClient } from "@prisma/client";

declare global {
    // Using var here is required for global declarations
    // eslint-disable-next-line no-var
    var prisma: PrismaClient | undefined;
}

const createPrismaClient = () => {
    return new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    });
};

export const db = globalThis.prisma || createPrismaClient();

if(process.env.NODE_ENV !== "production") globalThis.prisma = db;