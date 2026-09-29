-- CreateTable
CREATE TABLE "ElectricalRoom" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "panel" INTEGER,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "area" TEXT,
    "qrCode" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "RoomEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT NOT NULL,
    "enteredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "roomId" TEXT NOT NULL,
    CONSTRAINT "RoomEntry_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "ElectricalRoom" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ElectricalRoom_qrCode_key" ON "ElectricalRoom"("qrCode");

-- CreateIndex
CREATE INDEX "RoomEntry_roomId_idx" ON "RoomEntry"("roomId");

-- CreateIndex
CREATE INDEX "RoomEntry_enteredAt_idx" ON "RoomEntry"("enteredAt");
