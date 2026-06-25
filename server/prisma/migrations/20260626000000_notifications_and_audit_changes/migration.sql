-- Add USER_LOGGED_IN value to AuditAction enum
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'USER_LOGGED_IN';

-- Add createdAt index to Notification table for time-ordered pagination
CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
