-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'me',
    "name" TEXT NOT NULL DEFAULT 'Me',
    "photoUrl" TEXT,
    "updatedAt" DATETIME NOT NULL
);
