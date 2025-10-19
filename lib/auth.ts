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
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
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

        // Check if user is already logged in
        if (user.isActive) {
          throw new Error("UserAlreadyLoggedIn");
        }

        return {
          id: user.id,
          name: user.fullName,
          phoneNumber: user.phoneNumber,
          role: user.role,
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
    async session({ token, session }) {
      if (token && token.sessionId) {
        try {
          // Validate session on each request
          const { isValid } = await SessionManager.validateSession(token.sessionId as string);
          
          if (!isValid) {
            // Session is invalid, return null to force re-authentication
            return null;
          }

          session.user.id = token.id;
          session.user.name = token.name;
          session.user.phoneNumber = token.phoneNumber;
          session.user.image = token.picture ?? undefined;
          session.user.role = token.role;
        } catch (error) {
          console.error("Session validation error:", error);
          return null;
        }
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
            phoneNumber: user.phoneNumber,
            picture: (user as any).picture,
            role: user.role,
            sessionId: sessionId,
          };
        } catch (error) {
          console.error("Session creation error:", error);
          throw error;
        }
      }

      // On subsequent requests, return the existing token
      return token;
    },
  },
  debug: process.env.NODE_ENV === "development",
}; 