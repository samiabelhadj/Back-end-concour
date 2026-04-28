-- CreateTable
CREATE TABLE `academicModule` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT (now()),

    UNIQUE INDEX `name`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auditLog` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NULL,
    `action` VARCHAR(100) NOT NULL,
    `target_table` VARCHAR(60) NULL,
    `target_id` INTEGER NULL,
    `description` TEXT NULL,
    `ip_address` VARCHAR(45) NULL,
    `logged_at` DATETIME(0) NOT NULL DEFAULT (now()),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `userModule` (
    `user_id` INTEGER NOT NULL,
    `academicModule_id` INTEGER NOT NULL,

    INDEX `academicModule_id`(`academicModule_id`),
    PRIMARY KEY (`user_id`, `academicModule_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `userRole` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `role` ENUM('admin', 'professor_creator', 'corrector', 'supervisor', 'jury', 'coordinator', 'anonymat') NULL,
    `assigned_at` DATETIME(0) NOT NULL DEFAULT (now()),
    `assigned_by` INTEGER NOT NULL,

    INDEX `assigned_by`(`assigned_by`),
    UNIQUE INDEX `user_role_index_0`(`user_id`, `role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `first_name` VARCHAR(80) NOT NULL,
    `last_name` VARCHAR(80) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `grade` ENUM('MCB', 'MCA', 'professeur', 'IT engineer') NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(0) NOT NULL DEFAULT (now()),
    `updated_at` DATETIME(0) NOT NULL DEFAULT (now()),
    `faculty` VARCHAR(150) NULL,

    UNIQUE INDEX `email`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `importLogs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `filename` VARCHAR(255) NOT NULL,
    `total_lines` INTEGER NOT NULL,
    `imported` INTEGER NOT NULL,
    `errors` INTEGER NOT NULL,
    `imported_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `competition` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(200) NOT NULL,
    `academic_year` VARCHAR(20) NOT NULL,
    `description` TEXT NULL,
    `max_admitted` INTEGER NULL,
    `waiting_list_size` INTEGER NULL,
    `discrepancy_threshold` DECIMAL(5, 2) NULL,
    `affectation` ENUM('MANUEL', 'AUTOMATIQUE') NOT NULL DEFAULT 'MANUEL',
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `candidates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `candidate_id` VARCHAR(20) NULL,
    `competition_id` INTEGER NOT NULL,
    `annee_bac` VARCHAR(191) NULL,
    `matricule_bac` VARCHAR(191) NULL,
    `nom` VARCHAR(80) NOT NULL,
    `prenom` VARCHAR(80) NOT NULL,
    `nom_ar` VARCHAR(80) NULL,
    `prenom_ar` VARCHAR(80) NULL,
    `date_naissance` DATETIME(3) NULL,
    `lieu_naissance` VARCHAR(100) NULL,
    `telephone` VARCHAR(20) NULL,
    `email` VARCHAR(150) NOT NULL,
    `adresse` VARCHAR(255) NULL,
    `etablissement` VARCHAR(200) NULL,
    `annee_diplome` INTEGER NULL,
    `type_cursus` VARCHAR(30) NULL,
    `filiere` VARCHAR(150) NULL,
    `specialite` VARCHAR(150) NULL,
    `diplome` VARCHAR(100) NULL,
    `categorie_classement_master` VARCHAR(100) NULL,
    `moyenne_avant_derniere_ann` DOUBLE NULL,
    `moyenne_derniere_annee` DOUBLE NULL,
    `note_memoire_master` DOUBLE NULL,
    `specialite_demandee_fr` VARCHAR(200) NULL,
    `specialite_demandee_ar` VARCHAR(200) NULL,
    `url_progres` VARCHAR(255) NULL,
    `sheet_origine` VARCHAR(20) NOT NULL DEFAULT 'LMD',
    `statut` VARCHAR(20) NOT NULL DEFAULT 'INSCRIT',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,
    `examRoomId` INTEGER NULL,

    UNIQUE INDEX `candidates_candidate_id_key`(`candidate_id`),
    UNIQUE INDEX `candidates_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roomSupervisor` (
    `room_id` INTEGER NOT NULL,
    `supervisor_id` INTEGER NOT NULL,
    `exam_id` INTEGER NOT NULL,

    PRIMARY KEY (`room_id`, `supervisor_id`, `exam_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `examSession` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `exam_id` INTEGER NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `start_time` DATETIME(3) NOT NULL,
    `end_time` DATETIME(3) NOT NULL,

    UNIQUE INDEX `examSession_exam_id_name_key`(`exam_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `candidate_id` INTEGER NOT NULL,
    `supervisor_id` INTEGER NOT NULL,
    `session_id` INTEGER NOT NULL,
    `room_id` INTEGER NULL,
    `is_present` BOOLEAN NOT NULL DEFAULT false,
    `remarks` VARCHAR(191) NULL,
    `recorded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `attendance_candidate_id_session_id_key`(`candidate_id`, `session_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `examRoom` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `capacity` INTEGER NOT NULL,
    `block` VARCHAR(100) NULL,
    `status` ENUM('AVAILABLE', 'OCCUPIED', 'RESERVED', 'OUT_OF_SERVICE', 'CLOSED') NOT NULL DEFAULT 'AVAILABLE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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
CREATE TABLE `candidateRoom` (
    `candidate_id` INTEGER NOT NULL,
    `room_id` INTEGER NOT NULL,
    `exam_id` INTEGER NOT NULL,
    `session_id` INTEGER NULL,
    `place_number` INTEGER NULL,

    PRIMARY KEY (`candidate_id`, `room_id`, `exam_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `competitionRoom` (
    `competition_id` INTEGER NOT NULL,
    `room_id` INTEGER NOT NULL,
    `places_occupied` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`competition_id`, `room_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exam` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `competition_id` INTEGER NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `coefficient` DOUBLE NULL,
    `duration` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `userModule` ADD CONSTRAINT `userModule_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `userModule` ADD CONSTRAINT `userModule_ibfk_2` FOREIGN KEY (`academicModule_id`) REFERENCES `academicModule`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `userRole` ADD CONSTRAINT `user_role_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `userRole` ADD CONSTRAINT `user_role_ibfk_2` FOREIGN KEY (`assigned_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `competition` ADD CONSTRAINT `competition_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `candidates` ADD CONSTRAINT `candidates_competition_id_fkey` FOREIGN KEY (`competition_id`) REFERENCES `competition`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `candidates` ADD CONSTRAINT `candidates_examRoomId_fkey` FOREIGN KEY (`examRoomId`) REFERENCES `examRoom`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `roomSupervisor` ADD CONSTRAINT `roomSupervisor_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `examRoom`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `roomSupervisor` ADD CONSTRAINT `roomSupervisor_supervisor_id_fkey` FOREIGN KEY (`supervisor_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `roomSupervisor` ADD CONSTRAINT `roomSupervisor_exam_id_fkey` FOREIGN KEY (`exam_id`) REFERENCES `exam`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `examSession` ADD CONSTRAINT `examSession_exam_id_fkey` FOREIGN KEY (`exam_id`) REFERENCES `exam`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance` ADD CONSTRAINT `attendance_candidate_id_fkey` FOREIGN KEY (`candidate_id`) REFERENCES `candidates`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance` ADD CONSTRAINT `attendance_supervisor_id_fkey` FOREIGN KEY (`supervisor_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance` ADD CONSTRAINT `attendance_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `examSession`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance` ADD CONSTRAINT `attendance_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `examRoom`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `equipments` ADD CONSTRAINT `equipments_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `examRoom`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `candidateRoom` ADD CONSTRAINT `candidateRoom_candidate_id_fkey` FOREIGN KEY (`candidate_id`) REFERENCES `candidates`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `candidateRoom` ADD CONSTRAINT `candidateRoom_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `examRoom`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `candidateRoom` ADD CONSTRAINT `candidateRoom_exam_id_fkey` FOREIGN KEY (`exam_id`) REFERENCES `exam`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `candidateRoom` ADD CONSTRAINT `candidateRoom_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `examSession`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `competitionRoom` ADD CONSTRAINT `competitionRoom_competition_id_fkey` FOREIGN KEY (`competition_id`) REFERENCES `competition`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `competitionRoom` ADD CONSTRAINT `competitionRoom_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `examRoom`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam` ADD CONSTRAINT `exam_competition_id_fkey` FOREIGN KEY (`competition_id`) REFERENCES `competition`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
