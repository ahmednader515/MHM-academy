import NextAuth from "next-auth";
import { redirect } from "next/navigation";
import type { NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { SessionManager } from "@/lib/session-manager";

// Next-auth v5 configuration
const config: NextAuthConfig = {
  adapter: PrismaAdapter(db) as any,
  secret: process.env.NEXTAUTH_SECRET || "fallback-secret-for-development",
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? [
      Google({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      })
    ] : []),
    Credentials({
      name: "credentials",
      credentials: {
        phoneNumber: { label: "Phone Number", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.phoneNumber || !credentials?.password) {
            throw new Error("MissingCredentials");
          }

          const user = await db.user.findUnique({
            where: {
              phoneNumber: credentials.phoneNumber as string,
            },
          });

          if (!user) {
            throw new Error("UserNotFound");
          }

          if (!user.hashedPassword) {
            throw new Error("UserNotFound");
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password as string,
            user.hashedPassword
          );

          if (!isPasswordValid) {
            throw new Error("WrongPassword");
          }

          // Allow multiple device logins - no restriction

          return {
            id: user.id,
            name: user.fullName,
            phoneNumber: user.phoneNumber,
            role: user.role,
            points: user.points,
            parentPhoneNumber: user.parentPhoneNumber,
            isSuspended: user.isSuspended,
          } as any;
        } catch (error) {
          // Re-throw known errors
          if (error instanceof Error && 
              (error.message === "MissingCredentials" || 
               error.message === "UserNotFound" || 
               error.message === "WrongPassword")) {
            throw error;
          }
          // For database errors or other unexpected errors, throw server error
          console.error("Authentication error:", error);
          throw new Error("ServerError");
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    // Remove maxAge to make sessions persist indefinitely
    updateAge: 0, // Disable session updates
  },
  jwt: {
    // Remove maxAge to make JWT tokens persist indefinitely
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        // In production, NextAuth will automatically add __Secure- prefix
        // We don't need to add it manually
      },
    },
  },
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
  callbacks: {
    async session({ token, session, trigger }) {
      if (token) {
        // Skip validation for certain triggers to reduce queries
        // Only validate session on regular requests, not on signOut
        // Use timestamp-based validation to reduce frequency (validate every 2 minutes max)
        if (token.sessionId && trigger !== "signOut") {
          const now = Date.now();
          const lastValidation = (token.lastSessionValidation as number) || 0;
          const VALIDATION_INTERVAL = 120000; // 2 minutes
          
          // Only validate if enough time has passed since last validation
          if (now - lastValidation > VALIDATION_INTERVAL) {
            try {
              // Validate session (but cache the result)
              const { isValid, user: validatedUser } = await SessionManager.validateSession(token.sessionId as string);
              
              if (!isValid) {
                // Session is invalid, clear the sessionId but don't return null
                // This will trigger a re-authentication on the next request
                token.sessionId = undefined;
                token.lastSessionValidation = undefined;
              } else {
                // Update last validation timestamp and sync isSuspended status
                token.lastSessionValidation = now;
                if (validatedUser) {
                  token.isSuspended = validatedUser.isSuspended || false;
                }
              }
            } catch (error) {
              console.error("Session validation error:", error);
              // Clear sessionId on error but don't return null
              token.sessionId = undefined;
              token.lastSessionValidation = undefined;
            }
          }
        }

        // Always populate session data from token
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.phoneNumber = token.phoneNumber as string;
        session.user.image = token.picture as string | undefined;
        session.user.role = token.role as string;
        session.user.points = token.points as number;
        session.user.parentPhoneNumber = token.parentPhoneNumber as string;
        session.user.isSuspended = (token.isSuspended as boolean) || false;
      }

      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        try {
          // When user first signs in, create a new session
          const sessionId = await SessionManager.createSession(user.id);
          
          return {
            ...token,
            id: user.id,
            name: user.name,
            email: (user as any).email || "",
            phoneNumber: user.phoneNumber,
            picture: (user as any).picture,
            role: user.role,
            points: (user as any).points || 0,
            parentPhoneNumber: (user as any).parentPhoneNumber || null,
            isSuspended: (user as any).isSuspended || false,
            sessionId: sessionId,
          };
        } catch (error) {
          console.error("Session creation error:", error);
          // Return token without sessionId if session creation fails
          return {
            ...token,
            id: user.id,
            name: user.name,
            email: (user as any).email || "",
            phoneNumber: user.phoneNumber,
            picture: (user as any).picture,
            role: user.role,
            points: (user as any).points || 0,
            parentPhoneNumber: (user as any).parentPhoneNumber || null,
            isSuspended: (user as any).isSuspended || false,
          };
        }
      }

      // On subsequent requests, return the existing token
      return token;
    },
  },
  debug: process.env.NODE_ENV === "development",
};

// Create NextAuth instance - this returns handlers and auth
export const { handlers, auth, signIn, signOut } = NextAuth(config);

// Export config for reference if needed
export const authConfig = config;

// Helper function for server-side auth check
export const getAuthSession = async () => {
  const session = await auth();
  
  if (!session?.user) {
    redirect("/sign-in");
  }

  return {
    userId: session.user.id,
    user: session.user,
  };
};
