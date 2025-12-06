import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { SessionManager } from "@/lib/session-manager";

export async function POST(request: NextRequest) {
  try {
    // Get token directly without triggering session callback (avoids validation query)
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET || "fallback-secret-for-development"
    });
    
    if (!token?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // End the user's session directly (only 1 query needed)
    await SessionManager.endSession(token.id as string);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
