/*
  Warnings:

  - The primary key for the `candidate_room` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `session_id` on the `candidate_room` table. All the data in the column will be lost.
  - You are about to drop the column `competitionId` on the `candidates` table. All the data in the column will be lost.
  - You are about to drop the column `competition_id` on the `exam_room` table. All the data in the column will be lost.
  - Added the required column `exam_id` to the `candidate_room` table without a default value. This is not possible if the table is not empty.
  - Made the column `competition_id` on table `candidates` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `candidate_room` DROP FOREIGN KEY `candidate_room_session_id_fkey`;

-- DropForeignKey
ALTER TABLE `candidates` DROP FOREIGN KEY `candidates_competitionId_fkey`;

-- DropForeignKey
ALTER TABLE `competition` DROP FOREIGN KEY `competition_ibfk_1`;

-- DropForeignKey
ALTER TABLE `exam_room` DROP FOREIGN KEY `exam_room_ibfk_1`;

-- DropIndex
DROP INDEX `candidate_room_session_id_fkey` ON `candidate_room`;

-- DropIndex
DROP INDEX `candidates_competitionId_fkey` ON `candidates`;

-- DropIndex
DROP INDEX `competition_id` ON `exam_room`;

-- AlterTable
ALTER TABLE `candidate_room` DROP PRIMARY KEY,
    DROP COLUMN `session_id`,
    ADD COLUMN `exam_id` INTEGER NOT NULL,
    ADD COLUMN `exam_sessionId` INTEGER NULL,
    ADD COLUMN `place_number` INTEGER NULL,
    ADD PRIMARY KEY (`candidate_id`, `room_id`, `exam_id`);

-- AlterTable
ALTER TABLE `candidates` DROP COLUMN `competitionId`,
    MODIFY `competition_id` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `competition` ADD COLUMN `affectation` ENUM('MANUEL', 'AUTOMATIQUE') NOT NULL DEFAULT 'MANUEL',
    MODIFY `name` VARCHAR(200) NOT NULL,
    MODIFY `academic_year` VARCHAR(20) NOT NULL,
    MODIFY `max_admitted` INTEGER NULL,
    MODIFY `waiting_list_size` INTEGER NULL,
    MODIFY `discrepancy_threshold` DECIMAL(5, 2) NULL,
    MODIFY `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `exam_room` DROP COLUMN `competition_id`,
    ADD COLUMN `block` VARCHAR(100) NULL,
    ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `status` ENUM('AVAILABLE', 'OCCUPIED', 'RESERVED', 'OUT_OF_SERVICE', 'CLOSED') NOT NULL DEFAULT 'AVAILABLE';

-- CreateTable
CREATE TABLE `equipments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `room_id` INTEGER NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT (now()),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `competition_room` (
    `competition_id` INTEGER NOT NULL,
    `room_id` INTEGER NOT NULL,
    `places_occupied` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`competition_id`, `room_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `competition` ADD CONSTRAINT `competition_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `candidates` ADD CONSTRAINT `candidates_competition_id_fkey` FOREIGN KEY (`competition_id`) REFERENCES `competition`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `equipments` ADD CONSTRAINT `equipments_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `exam_room`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `candidate_room` ADD CONSTRAINT `candidate_room_exam_sessionId_fkey` FOREIGN KEY (`exam_sessionId`) REFERENCES `exam_session`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `competition_room` ADD CONSTRAINT `competition_room_competition_id_fkey` FOREIGN KEY (`competition_id`) REFERENCES `competition`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `competition_room` ADD CONSTRAINT `competition_room_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `exam_room`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
