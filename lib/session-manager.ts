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
      select: { isActive: true, sessionId: true }
    });

    return user?.isActive || false;
  }

  /**
   * Check if user has an active session by phone number
   */
  static async isUserActiveByPhone(phoneNumber: string): Promise<boolean> {
    const user = await db.user.findUnique({
      where: { phoneNumber },
      select: { isActive: true, sessionId: true }
    });

    return user?.isActive || false;
  }

  /**
   * Create a new session for user
   */
  static async createSession(userId: string): Promise<string> {
    const sessionId = this.generateSessionId();
    
    await db.user.update({
      where: { id: userId },
      data: {
        isActive: true,
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
        isActive: false,
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
        isActive: false,
        sessionId: null
      }
    });
  }

  /**
   * Validate session and return user if valid
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
        isActive: true,
        sessionId: true
      }
    });

    if (!user || !user.isActive || user.sessionId !== sessionId) {
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
        isActive: false,
        sessionId: null
      }
    });
  }

  /**
   * Clean up expired sessions (optional - for maintenance)
   */
  static async cleanupExpiredSessions(): Promise<void> {
    // This could be implemented to clean up sessions older than a certain time
    // For now, we'll rely on the isActive flag
    const expiredUsers = await db.user.findMany({
      where: {
        isActive: true,
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
