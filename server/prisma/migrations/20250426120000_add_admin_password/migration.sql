-- RedefineClassSession
-- SQLite: add optional column for teacher dashboard password
ALTER TABLE "sessions" ADD COLUMN "admin_password" TEXT;
