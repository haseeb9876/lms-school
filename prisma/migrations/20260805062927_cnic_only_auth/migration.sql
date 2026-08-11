-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "cnic" TEXT,
    "fatherCnic" TEXT,
    "password" TEXT DEFAULT '',
    "role" TEXT NOT NULL DEFAULT 'STUDENT',
    "classScope" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("classScope", "cnic", "createdAt", "fatherCnic", "id", "name", "password", "role", "updatedAt") SELECT "classScope", "cnic", "createdAt", "fatherCnic", "id", "name", "password", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_cnic_key" ON "User"("cnic");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
