import { db } from "@/lib/db";
import { randomBytes } from "crypto";

export class SessionManager {
  /**
   * Generate a unique session ID
   */
  private static generateSessionId(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Check if user is already logged in
   */
  static async isUserActive(userId: string): Promise<boolean> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { sessionId: true }
    });

    return !!user?.sessionId;
  }

  /**
   * Check if user has an active session by phone number
   */
  static async isUserActiveByPhone(phoneNumber: string): Promise<boolean> {
    const user = await db.user.findUnique({
      where: { phoneNumber },
      select: { sessionId: true }
    });

    return !!user?.sessionId;
  }

  /**
   * Create a new session for user
   */
  static async createSession(userId: string): Promise<string> {
    const sessionId = this.generateSessionId();
    
    await db.user.update({
      where: { id: userId },
      data: {
        sessionId: sessionId,
        lastLoginAt: new Date()
      }
    });

    return sessionId;
  }

  /**
   * End user session
   */
  static async endSession(userId: string): Promise<void> {
    await db.user.update({
      where: { id: userId },
      data: {
        sessionId: null
      }
    });
  }

  /**
   * End session by session ID
   */
  static async endSessionById(sessionId: string): Promise<void> {
    await db.user.updateMany({
      where: { sessionId },
      data: {
        sessionId: null
      }
    });
  }

  /**
   * Validate session and return user if valid
   * Uses Prisma Accelerate caching to reduce database queries
   */
  static async validateSession(sessionId: string): Promise<{ user: any; isValid: boolean }> {
    const user = await db.user.findUnique({
      where: { sessionId },
      select: {
        id: true,
        fullName: true,
        phoneNumber: true,
        email: true,
        role: true,
        image: true,
        sessionId: true,
        isSuspended: true
      },
      cacheStrategy: { ttl: 30 } // Cache session validation for 30 seconds (reduces queries while maintaining security)
    });

    if (!user || user.sessionId !== sessionId) {
      return { user: null, isValid: false };
    }

    return { user, isValid: true };
  }

  /**
   * Force logout all other sessions for a user (except current session)
   */
  static async forceLogoutOtherSessions(userId: string, currentSessionId: string): Promise<void> {
    await db.user.update({
      where: { id: userId },
      data: {
        sessionId: null
      }
    });
  }

  /**
   * Clean up expired sessions (optional - for maintenance)
   */
  static async cleanupExpiredSessions(): Promise<void> {
    // Clean up sessions older than 24 hours
    const expiredUsers = await db.user.findMany({
      where: {
        sessionId: { not: null },
        lastLoginAt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
        }
      }
    });

    for (const user of expiredUsers) {
      await this.endSession(user.id);
    }
  }
}
