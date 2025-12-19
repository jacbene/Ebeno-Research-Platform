// backend/prisma/migrations/20250101000002_add_field_data_models/migration.sql
-- CreateEnum
CREATE TYPE "FieldNoteType" AS ENUM ('OBSERVATION', 'INTERVIEW', 'REFLECTION', 'PHOTO', 'AUDIO', 'VIDEO', 'DOCUMENT');

-- CreateTable
CREATE TABLE "FieldNote" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "FieldNoteType" NOT NULL,
    "location" JSONB,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT,
    "isSynced" BOOLEAN NOT NULL DEFAULT false,
    "syncVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldMedia" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "description" TEXT,
    "fieldNoteId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FieldMedia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FieldNote_projectId_idx" ON "FieldNote"("projectId");

-- CreateIndex
CREATE INDEX "FieldNote_userId_idx" ON "FieldNote"("userId");

-- CreateIndex
CREATE INDEX "FieldNote_createdAt_idx" ON "FieldNote"("createdAt");

-- CreateIndex
CREATE INDEX "FieldMedia_fieldNoteId_idx" ON "FieldMedia"("fieldNoteId");

-- AddForeignKey
ALTER TABLE "FieldNote" ADD CONSTRAINT "FieldNote_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldNote" ADD CONSTRAINT "FieldNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldMedia" ADD CONSTRAINT "FieldMedia_fieldNoteId_fkey" FOREIGN KEY ("fieldNoteId") REFERENCES "FieldNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldMedia" ADD CONSTRAINT "FieldMedia_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
