-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "avatar" TEXT,
    "bio" TEXT,
    "language" TEXT NOT NULL DEFAULT 'zh-TW',
    "notifications" BOOLEAN NOT NULL DEFAULT true,
    "darkMode" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "totalStudyTime" INTEGER NOT NULL DEFAULT 0,
    "totalMessages" INTEGER NOT NULL DEFAULT 0,
    "streak" INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "new_users" ("avatar", "createdAt", "email", "id", "password", "streak", "totalMessages", "totalStudyTime", "updatedAt", "username") SELECT "avatar", "createdAt", "email", "id", "password", "streak", "totalMessages", "totalStudyTime", "updatedAt", "username" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
