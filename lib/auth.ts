import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { AuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import GoogleProvider from "next-auth/providers/google";
import { Adapter } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { SessionManager } from "@/lib/session-manager";

export const auth = async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/sign-in");
  }

  return {
    userId: session.user.id,
    user: session.user,
  };
};

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(db) as Adapter,
  secret: process.env.NEXTAUTH_SECRET || "fallback-secret-for-development",
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      })
    ] : []),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        phoneNumber: { label: "Phone Number", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.phoneNumber || !credentials?.password) {
          throw new Error("Missing credentials");
        }

        const user = await db.user.findUnique({
          where: {
            phoneNumber: credentials.phoneNumber,
          },
        });

        if (!user || !user.hashedPassword) {
          throw new Error("Invalid credentials");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        );

        if (!isPasswordValid) {
          throw new Error("Invalid credentials");
        }

        // Allow multiple device logins - no restriction

        return {
          id: user.id,
          name: user.fullName,
          phoneNumber: user.phoneNumber,
          role: user.role,
          points: user.points,
          parentPhoneNumber: user.parentPhoneNumber,
        } as any;
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
              const { isValid } = await SessionManager.validateSession(token.sessionId as string);
              
              if (!isValid) {
                // Session is invalid, clear the sessionId but don't return null
                // This will trigger a re-authentication on the next request
                token.sessionId = undefined;
                token.lastSessionValidation = undefined;
              } else {
                // Update last validation timestamp
                token.lastSessionValidation = now;
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
          };
        }
      }

      // On subsequent requests, return the existing token
      return token;
    },
  },
  debug: process.env.NODE_ENV === "development",
}; 