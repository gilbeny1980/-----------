-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Transformer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "activePowerKw" REAL,
    "powerFactor" REAL,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Transformer" ("activePowerKw", "createdAt", "id", "name", "powerFactor", "updatedAt") SELECT "activePowerKw", "createdAt", "id", "name", "powerFactor", "updatedAt" FROM "Transformer";
DROP TABLE "Transformer";
ALTER TABLE "new_Transformer" RENAME TO "Transformer";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
