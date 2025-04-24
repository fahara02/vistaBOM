/*
  Warnings:

  - A unique constraint covering the columns `[user_id,projectName]` on the table `Project` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Project_projectName_key";

-- CreateIndex
CREATE UNIQUE INDEX "Project_user_id_projectName_key" ON "Project"("user_id", "projectName");
