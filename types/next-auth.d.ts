import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      image?: string;
      phoneNumber?: string;
      role: string;
      points?: number;
      parentPhoneNumber?: string;
      isSuspended?: boolean;
    };
  }

  interface User {
    id: string;
    name: string;
    email: string;
    phoneNumber?: string;
    role: string;
    points?: number;
    parentPhoneNumber?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    name: string;
    email: string;
    phoneNumber?: string;
    role: string;
    points?: number;
    parentPhoneNumber?: string;
    isSuspended?: boolean;
    sessionId?: string;
  }
} 