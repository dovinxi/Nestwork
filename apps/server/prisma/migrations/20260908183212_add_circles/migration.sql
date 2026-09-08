-- CreateTable
CREATE TABLE "Circle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "_ContactCircles" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ContactCircles_A_fkey" FOREIGN KEY ("A") REFERENCES "Circle" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ContactCircles_B_fkey" FOREIGN KEY ("B") REFERENCES "Contact" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Circle_name_key" ON "Circle"("name");

-- CreateIndex
CREATE UNIQUE INDEX "_ContactCircles_AB_unique" ON "_ContactCircles"("A", "B");

-- CreateIndex
CREATE INDEX "_ContactCircles_B_index" ON "_ContactCircles"("B");
