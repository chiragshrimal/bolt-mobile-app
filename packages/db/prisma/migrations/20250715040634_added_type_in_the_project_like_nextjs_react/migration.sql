-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('REACT_NATIVE', 'NEXTJS', 'REACT');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "type" "ProjectType" NOT NULL DEFAULT 'NEXTJS';
