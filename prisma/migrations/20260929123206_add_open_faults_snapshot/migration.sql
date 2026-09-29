-- CreateTable
CREATE TABLE "OpenFaultsSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "count" INTEGER NOT NULL,
    "faults" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);
