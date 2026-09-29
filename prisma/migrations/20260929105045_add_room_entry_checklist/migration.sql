-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RoomEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT NOT NULL,
    "roomClean" BOOLEAN NOT NULL DEFAULT false,
    "acWorking" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "enteredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "roomId" TEXT NOT NULL,
    CONSTRAINT "RoomEntry_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "ElectricalRoom" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_RoomEntry" ("enteredAt", "id", "phone", "roomId") SELECT "enteredAt", "id", "phone", "roomId" FROM "RoomEntry";
DROP TABLE "RoomEntry";
ALTER TABLE "new_RoomEntry" RENAME TO "RoomEntry";
CREATE INDEX "RoomEntry_roomId_idx" ON "RoomEntry"("roomId");
CREATE INDEX "RoomEntry_enteredAt_idx" ON "RoomEntry"("enteredAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
