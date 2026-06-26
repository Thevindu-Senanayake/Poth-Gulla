-- Add RESERVED to ItemStatus enum (book copy is assigned but not yet physically collected)
ALTER TYPE "ItemStatus" ADD VALUE IF NOT EXISTS 'RESERVED';

-- Add archivedAt to BookTitle for soft-delete support
ALTER TABLE "BookTitle" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);
