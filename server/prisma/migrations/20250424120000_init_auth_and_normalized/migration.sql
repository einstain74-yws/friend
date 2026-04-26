-- SQLite: JSON 컬럼은 TEXT로 저장 (Prisma Json)
-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'STUDENT',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "user_auth_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teacher_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sessions_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "roster" (
    "session_id" TEXT NOT NULL PRIMARY KEY,
    "data" TEXT NOT NULL,
    CONSTRAINT "roster_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "survey_responses" (
    "session_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "updated_at" DATETIME NOT NULL,
    PRIMARY KEY ("session_id", "author_id"),
    CONSTRAINT "survey_responses_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "survey_submissions" (
    "session_id" TEXT NOT NULL,
    "author_student_id" TEXT NOT NULL,
    "submitted_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("session_id", "author_student_id"),
    CONSTRAINT "survey_submissions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "survey_answers" (
    "session_id" TEXT NOT NULL,
    "author_student_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    PRIMARY KEY ("session_id", "author_student_id", "question"),
    CONSTRAINT "survey_answers_session_id_author_student_id_fkey" FOREIGN KEY ("session_id", "author_student_id") REFERENCES "survey_submissions" ("session_id", "author_student_id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
