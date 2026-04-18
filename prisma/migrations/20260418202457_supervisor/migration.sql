-- CreateTable
CREATE TABLE `import_logs` (
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
    `name` VARCHAR(150) NOT NULL,
    `academic_year` VARCHAR(9) NOT NULL,
    `description` TEXT NULL,
    `max_admitted` INTEGER NOT NULL DEFAULT 10,
    `waiting_list_size` INTEGER NOT NULL DEFAULT 5,
    `discrepancy_threshold` DECIMAL(5, 2) NOT NULL DEFAULT 3.00,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT (now()),

    INDEX `created_by`(`created_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `candidates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `candidate_id` VARCHAR(20) NULL,
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
    `competition_id` INTEGER NULL,
    `competitionId` INTEGER NULL,
    `exam_roomId` INTEGER NULL,

    UNIQUE INDEX `candidates_candidate_id_key`(`candidate_id`),
    UNIQUE INDEX `candidates_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `room_supervisor` (
    `room_id` INTEGER NOT NULL,
    `supervisor_id` INTEGER NOT NULL,

    INDEX `supervisor_id`(`supervisor_id`),
    PRIMARY KEY (`room_id`, `supervisor_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exam_session` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `competition_id` INTEGER NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `start_time` DATETIME(3) NOT NULL,
    `end_time` DATETIME(3) NOT NULL,

    INDEX `exam_session_competition_id_idx`(`competition_id`),
    UNIQUE INDEX `exam_session_competition_id_name_key`(`competition_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `candidate_id` INTEGER NOT NULL,
    `room_id` INTEGER NOT NULL,
    `supervisor_id` INTEGER NOT NULL,
    `session_id` INTEGER NOT NULL,
    `is_present` BOOLEAN NOT NULL DEFAULT false,
    `remarks` TEXT NULL,
    `recorded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `attendance_candidate_id_session_id_key`(`candidate_id`, `session_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exam_room` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `competition_id` INTEGER NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `capacity` INTEGER NOT NULL,

    INDEX `competition_id`(`competition_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `candidate_room` (
    `candidate_id` INTEGER NOT NULL,
    `room_id` INTEGER NOT NULL,
    `session_id` INTEGER NOT NULL,

    PRIMARY KEY (`candidate_id`, `session_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `competition` ADD CONSTRAINT `competition_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `candidates` ADD CONSTRAINT `candidates_competitionId_fkey` FOREIGN KEY (`competitionId`) REFERENCES `competition`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `candidates` ADD CONSTRAINT `candidates_exam_roomId_fkey` FOREIGN KEY (`exam_roomId`) REFERENCES `exam_room`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_supervisor` ADD CONSTRAINT `room_supervisor_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `exam_room`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `room_supervisor` ADD CONSTRAINT `room_supervisor_ibfk_2` FOREIGN KEY (`supervisor_id`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `exam_session` ADD CONSTRAINT `exam_session_competition_id_fkey` FOREIGN KEY (`competition_id`) REFERENCES `competition`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance` ADD CONSTRAINT `attendance_candidate_id_fkey` FOREIGN KEY (`candidate_id`) REFERENCES `candidates`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance` ADD CONSTRAINT `attendance_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `exam_room`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance` ADD CONSTRAINT `attendance_supervisor_id_fkey` FOREIGN KEY (`supervisor_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance` ADD CONSTRAINT `attendance_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `exam_session`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam_room` ADD CONSTRAINT `exam_room_ibfk_1` FOREIGN KEY (`competition_id`) REFERENCES `competition`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `candidate_room` ADD CONSTRAINT `candidate_room_candidate_id_fkey` FOREIGN KEY (`candidate_id`) REFERENCES `candidates`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `candidate_room` ADD CONSTRAINT `candidate_room_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `exam_room`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `candidate_room` ADD CONSTRAINT `candidate_room_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `exam_session`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
