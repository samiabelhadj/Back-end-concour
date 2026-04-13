/*
  Warnings:

  - You are about to drop the `competition` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `role_conflict_log` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `competition` DROP FOREIGN KEY `competition_ibfk_1`;

-- DropForeignKey
ALTER TABLE `role_conflict_log` DROP FOREIGN KEY `role_conflict_log_ibfk_1`;

-- DropForeignKey
ALTER TABLE `role_conflict_log` DROP FOREIGN KEY `role_conflict_log_ibfk_2`;

-- DropForeignKey
ALTER TABLE `role_conflict_log` DROP FOREIGN KEY `role_conflict_log_ibfk_3`;

-- DropTable
DROP TABLE `competition`;

-- DropTable
DROP TABLE `role_conflict_log`;
