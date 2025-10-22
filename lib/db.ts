import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'

declare global {
    // Using var here is required for global declarations
    // eslint-disable-next-line no-var
    var prisma: ReturnType<typeof createPrismaClient> | undefined;
}

const createPrismaClient = () => {
    return new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    }).$extends(withAccelerate());
};

export const db = globalThis.prisma || createPrismaClient();

if(process.env.NODE_ENV !== "production") globalThis.prisma = db;