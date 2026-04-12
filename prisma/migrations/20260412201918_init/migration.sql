-- CreateTable
CREATE TABLE `academic_module` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT (now()),

    UNIQUE INDEX `name`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_log` (
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
CREATE TABLE `role_conflict_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `attempted_email` VARCHAR(150) NOT NULL,
    `attempted_role` VARCHAR(255) NOT NULL,
    `conflict_reason` VARCHAR(255) NOT NULL,
    `competition_id` INTEGER NULL,
    `module_id` INTEGER NULL,
    `attempted_by` INTEGER NOT NULL,
    `attempted_at` DATETIME(0) NOT NULL DEFAULT (now()),

    INDEX `attempted_by`(`attempted_by`),
    INDEX `competition_id`(`competition_id`),
    INDEX `module_id`(`module_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_module` (
    `user_id` INTEGER NOT NULL,
    `academic_module_id` INTEGER NOT NULL,

    INDEX `academic_module_id`(`academic_module_id`),
    PRIMARY KEY (`user_id`, `academic_module_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_role` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `role` ENUM('admin', 'professor_creator', 'corrector', 'supervisor', 'jury', 'coordinator') NULL,
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
CREATE TABLE `anonymisation_key` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `candidate_id` INTEGER NOT NULL,
    `anonymous_code` VARCHAR(20) NOT NULL,
    `encrypted_link` VARBINARY(512) NOT NULL,
    `revealed` BOOLEAN NOT NULL DEFAULT false,
    `revealed_at` DATETIME(0) NULL,
    `revealed_by` INTEGER NULL,

    UNIQUE INDEX `candidate_id`(`candidate_id`),
    UNIQUE INDEX `anonymous_code`(`anonymous_code`),
    INDEX `revealed_by`(`revealed_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `anonymised_copy` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `competition_id` INTEGER NOT NULL,
    `anonymous_code` VARCHAR(20) NOT NULL,
    `scan_file_path` VARCHAR(500) NULL,
    `qr_code_data` VARCHAR(255) NULL,
    `is_absent` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(0) NOT NULL DEFAULT (now()),

    UNIQUE INDEX `anonymous_code`(`anonymous_code`),
    INDEX `competition_id`(`competition_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `candidate_id` INTEGER NOT NULL,
    `room_id` INTEGER NOT NULL,
    `supervisor_id` INTEGER NOT NULL,
    `is_present` BOOLEAN NOT NULL DEFAULT false,
    `remarks` TEXT NULL,
    `recorded_at` DATETIME(0) NOT NULL DEFAULT (now()),

    UNIQUE INDEX `candidate_id`(`candidate_id`),
    INDEX `room_id`(`room_id`),
    INDEX `supervisor_id`(`supervisor_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `candidate` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `competition_id` INTEGER NOT NULL,
    `registration_number` VARCHAR(30) NOT NULL,
    `first_name` VARCHAR(80) NOT NULL,
    `last_name` VARCHAR(80) NOT NULL,
    `email` VARCHAR(150) NULL,
    `phone` VARCHAR(20) NULL,
    `room_id` INTEGER NULL,
    `seat_number` INTEGER NULL,
    `imported_at` DATETIME(0) NOT NULL DEFAULT (now()),

    INDEX `room_id`(`room_id`),
    UNIQUE INDEX `candidate_index_3`(`competition_id`, `registration_number`),
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
CREATE TABLE `competition_phase` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `competition_id` INTEGER NOT NULL,
    `phase_order` INTEGER NOT NULL,
    `opened_at` DATETIME(0) NULL,
    `closed_at` DATETIME(0) NULL,
    `closed_by` INTEGER NULL,
    `phase_name_id` INTEGER NULL,
    `status_id` INTEGER NULL,

    INDEX `closed_by`(`closed_by`),
    INDEX `fk_competition_phase_name`(`phase_name_id`),
    INDEX `fk_competition_phase_status`(`status_id`),
    UNIQUE INDEX `competition_phase_index_1`(`competition_id`, `phase_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `competition_phase_name` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,

    UNIQUE INDEX `name`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `competition_phase_status` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,

    UNIQUE INDEX `name`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `correction` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `corrector_assignment_id` INTEGER NOT NULL,
    `total_score` DECIMAL(5, 2) NULL,
    `is_validated` BOOLEAN NOT NULL DEFAULT false,
    `validated_at` DATETIME(0) NULL,

    UNIQUE INDEX `corrector_assignment_id`(`corrector_assignment_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `correction_exercise_score` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `correction_id` INTEGER NOT NULL,
    `exercise_id` INTEGER NOT NULL,
    `score` DECIMAL(5, 2) NOT NULL,

    INDEX `exercise_id`(`exercise_id`),
    UNIQUE INDEX `correction_exercise_score_index_5`(`correction_id`, `exercise_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `corrector_assignment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `anonymised_copy_id` INTEGER NOT NULL,
    `corrector_id` INTEGER NOT NULL,
    `correction_round` TINYINT NOT NULL,
    `assigned_at` DATETIME(0) NOT NULL DEFAULT (now()),
    `assigned_by` INTEGER NOT NULL,

    INDEX `assigned_by`(`assigned_by`),
    INDEX `corrector_id`(`corrector_id`),
    UNIQUE INDEX `corrector_assignment_index_4`(`anonymised_copy_id`, `corrector_id`, `correction_round`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `deliberation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `competition_id` INTEGER NOT NULL,
    `min_score` DECIMAL(5, 2) NOT NULL DEFAULT 10.00,
    `closed_by` INTEGER NULL,
    `closed_at` DATETIME(0) NULL,
    `pv_id` INTEGER NULL,
    `status_id` INTEGER NOT NULL DEFAULT 2,

    UNIQUE INDEX `competition_id`(`competition_id`),
    INDEX `closed_by`(`closed_by`),
    INDEX `fk_deliberation_status`(`status_id`),
    INDEX `pv_id`(`pv_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `deliberation_remark` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `deliberation_id` INTEGER NOT NULL,
    `jury_member_id` INTEGER NOT NULL,
    `remark` TEXT NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT (now()),

    INDEX `deliberation_id`(`deliberation_id`),
    INDEX `jury_member_id`(`jury_member_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `deliberation_status` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(20) NOT NULL,

    UNIQUE INDEX `name`(`name`),
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
CREATE TABLE `exam_subject` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `competition_id` INTEGER NOT NULL,
    `pdf_path` VARCHAR(500) NOT NULL,
    `generated_by` INTEGER NOT NULL,
    `generated_at` DATETIME(0) NOT NULL DEFAULT (now()),
    `is_locked` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `competition_id`(`competition_id`),
    INDEX `generated_by`(`generated_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exam_subject_exercise` (
    `exam_subject_id` INTEGER NOT NULL,
    `exercise_id` INTEGER NOT NULL,
    `display_order` INTEGER NOT NULL,

    INDEX `exercise_id`(`exercise_id`),
    PRIMARY KEY (`exam_subject_id`, `exercise_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exercise` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `competition_id` INTEGER NOT NULL,
    `professor_id` INTEGER NOT NULL,
    `academic_module_id` INTEGER NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
    `points` DECIMAL(5, 2) NOT NULL,
    `expected_answer` TEXT NULL,
    `file_path` VARCHAR(500) NULL,
    `is_locked` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(0) NOT NULL DEFAULT (now()),
    `difficulty_id` INTEGER NULL,
    `file_type_id` INTEGER NULL,

    INDEX `academic_module_id`(`academic_module_id`),
    INDEX `competition_id`(`competition_id`),
    INDEX `fk_exercise_difficulty`(`difficulty_id`),
    INDEX `fk_exercise_file_type`(`file_type_id`),
    INDEX `professor_id`(`professor_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exercise_difficulty` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(20) NOT NULL,

    UNIQUE INDEX `name`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exercise_file_type` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(20) NOT NULL,

    UNIQUE INDEX `name`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exercise_version` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `exercise_id` INTEGER NOT NULL,
    `version_number` INTEGER NOT NULL DEFAULT 1,
    `description` TEXT NOT NULL,
    `file_path` VARCHAR(500) NULL,
    `modified_by` INTEGER NOT NULL,
    `modified_at` DATETIME(0) NOT NULL DEFAULT (now()),

    INDEX `exercise_id`(`exercise_id`),
    INDEX `modified_by`(`modified_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `grading_discrepancy` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `anonymised_copy_id` INTEGER NOT NULL,
    `score_round_1` DECIMAL(5, 2) NOT NULL,
    `score_round_2` DECIMAL(5, 2) NOT NULL,
    `score_round_3` DECIMAL(5, 2) NULL,
    `gap` DECIMAL(5, 2) NOT NULL,
    `threshold` DECIMAL(5, 2) NOT NULL,
    `third_corrector_id` INTEGER NULL,
    `final_score` DECIMAL(5, 2) NULL,
    `resolved_at` DATETIME(0) NULL,

    UNIQUE INDEX `anonymised_copy_id`(`anonymised_copy_id`),
    INDEX `third_corrector_id`(`third_corrector_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `professor_selection` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `competition_id` INTEGER NOT NULL,
    `professor_id` INTEGER NOT NULL,
    `academic_module_id` INTEGER NOT NULL,
    `submission_deadline` DATETIME(0) NOT NULL,
    `selected_at` DATETIME(0) NOT NULL DEFAULT (now()),
    `selected_by` INTEGER NOT NULL,

    INDEX `academic_module_id`(`academic_module_id`),
    INDEX `professor_id`(`professor_id`),
    INDEX `selected_by`(`selected_by`),
    UNIQUE INDEX `professor_selection_index_2`(`competition_id`, `professor_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pv` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `competition_id` INTEGER NOT NULL,
    `file_path` VARCHAR(500) NOT NULL,
    `generated_by` INTEGER NOT NULL,
    `generated_at` DATETIME(0) NOT NULL DEFAULT (now()),
    `is_signed` BOOLEAN NOT NULL DEFAULT false,
    `pv_type_id` INTEGER NULL,

    INDEX `competition_id`(`competition_id`),
    INDEX `fk_pv_type`(`pv_type_id`),
    INDEX `generated_by`(`generated_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pv_signature` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pv_id` INTEGER NOT NULL,
    `signer_id` INTEGER NOT NULL,
    `signed_at` DATETIME(0) NOT NULL DEFAULT (now()),
    `signature` TEXT NULL,

    INDEX `signer_id`(`signer_id`),
    UNIQUE INDEX `pv_signature_index_6`(`pv_id`, `signer_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pv_type` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,

    UNIQUE INDEX `name`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ranking` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `competition_id` INTEGER NOT NULL,
    `anonymised_copy_id` INTEGER NOT NULL,
    `final_score` DECIMAL(5, 2) NOT NULL,
    `rank_position` INTEGER NULL,
    `is_admitted` BOOLEAN NOT NULL DEFAULT false,
    `is_waiting_list` BOOLEAN NOT NULL DEFAULT false,
    `is_eliminated` BOOLEAN NOT NULL DEFAULT false,
    `generated_at` DATETIME(0) NOT NULL DEFAULT (now()),

    UNIQUE INDEX `anonymised_copy_id`(`anonymised_copy_id`),
    INDEX `competition_id`(`competition_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `result_publication` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `competition_id` INTEGER NOT NULL,
    `published_by` INTEGER NOT NULL,
    `published_at` DATETIME(0) NOT NULL DEFAULT (now()),
    `pdf_path` VARCHAR(500) NULL,
    `excel_path` VARCHAR(500) NULL,
    `emails_sent` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `competition_id`(`competition_id`),
    INDEX `published_by`(`published_by`),
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
CREATE TABLE `subject_generation_rule` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `competition_id` INTEGER NOT NULL,
    `total_exercises` INTEGER NOT NULL,
    `total_points` DECIMAL(5, 2) NOT NULL,
    `min_hard_exercises` INTEGER NOT NULL DEFAULT 1,
    `min_easy_exercises` INTEGER NOT NULL DEFAULT 1,
    `configured_by` INTEGER NOT NULL,
    `configured_at` DATETIME(0) NOT NULL DEFAULT (now()),

    UNIQUE INDEX `competition_id`(`competition_id`),
    INDEX `configured_by`(`configured_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `role_conflict_log` ADD CONSTRAINT `role_conflict_log_ibfk_1` FOREIGN KEY (`competition_id`) REFERENCES `competition`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `role_conflict_log` ADD CONSTRAINT `role_conflict_log_ibfk_2` FOREIGN KEY (`module_id`) REFERENCES `academic_module`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `role_conflict_log` ADD CONSTRAINT `role_conflict_log_ibfk_3` FOREIGN KEY (`attempted_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user_module` ADD CONSTRAINT `user_module_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user_module` ADD CONSTRAINT `user_module_ibfk_2` FOREIGN KEY (`academic_module_id`) REFERENCES `academic_module`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user_role` ADD CONSTRAINT `user_role_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user_role` ADD CONSTRAINT `user_role_ibfk_2` FOREIGN KEY (`assigned_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `anonymisation_key` ADD CONSTRAINT `anonymisation_key_ibfk_1` FOREIGN KEY (`candidate_id`) REFERENCES `candidate`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `anonymisation_key` ADD CONSTRAINT `anonymisation_key_ibfk_2` FOREIGN KEY (`revealed_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `anonymised_copy` ADD CONSTRAINT `anonymised_copy_ibfk_1` FOREIGN KEY (`competition_id`) REFERENCES `competition`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `attendance` ADD CONSTRAINT `attendance_ibfk_1` FOREIGN KEY (`candidate_id`) REFERENCES `candidate`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `attendance` ADD CONSTRAINT `attendance_ibfk_2` FOREIGN KEY (`room_id`) REFERENCES `exam_room`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `attendance` ADD CONSTRAINT `attendance_ibfk_3` FOREIGN KEY (`supervisor_id`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `candidate` ADD CONSTRAINT `candidate_ibfk_1` FOREIGN KEY (`competition_id`) REFERENCES `competition`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `candidate` ADD CONSTRAINT `candidate_ibfk_2` FOREIGN KEY (`room_id`) REFERENCES `exam_room`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `competition` ADD CONSTRAINT `competition_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `competition_phase` ADD CONSTRAINT `competition_phase_ibfk_1` FOREIGN KEY (`competition_id`) REFERENCES `competition`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `competition_phase` ADD CONSTRAINT `competition_phase_ibfk_2` FOREIGN KEY (`closed_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `competition_phase` ADD CONSTRAINT `fk_competition_phase_name` FOREIGN KEY (`phase_name_id`) REFERENCES `competition_phase_name`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `competition_phase` ADD CONSTRAINT `fk_competition_phase_status` FOREIGN KEY (`status_id`) REFERENCES `competition_phase_status`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `correction` ADD CONSTRAINT `correction_ibfk_1` FOREIGN KEY (`corrector_assignment_id`) REFERENCES `corrector_assignment`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `correction_exercise_score` ADD CONSTRAINT `correction_exercise_score_ibfk_1` FOREIGN KEY (`correction_id`) REFERENCES `correction`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `correction_exercise_score` ADD CONSTRAINT `correction_exercise_score_ibfk_2` FOREIGN KEY (`exercise_id`) REFERENCES `exercise`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `corrector_assignment` ADD CONSTRAINT `corrector_assignment_ibfk_1` FOREIGN KEY (`anonymised_copy_id`) REFERENCES `anonymised_copy`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `corrector_assignment` ADD CONSTRAINT `corrector_assignment_ibfk_2` FOREIGN KEY (`corrector_id`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `corrector_assignment` ADD CONSTRAINT `corrector_assignment_ibfk_3` FOREIGN KEY (`assigned_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `deliberation` ADD CONSTRAINT `deliberation_ibfk_1` FOREIGN KEY (`competition_id`) REFERENCES `competition`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `deliberation` ADD CONSTRAINT `deliberation_ibfk_2` FOREIGN KEY (`closed_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `deliberation` ADD CONSTRAINT `deliberation_ibfk_3` FOREIGN KEY (`pv_id`) REFERENCES `pv`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `deliberation` ADD CONSTRAINT `fk_deliberation_status` FOREIGN KEY (`status_id`) REFERENCES `deliberation_status`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `deliberation_remark` ADD CONSTRAINT `deliberation_remark_ibfk_1` FOREIGN KEY (`deliberation_id`) REFERENCES `deliberation`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `deliberation_remark` ADD CONSTRAINT `deliberation_remark_ibfk_2` FOREIGN KEY (`jury_member_id`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `exam_room` ADD CONSTRAINT `exam_room_ibfk_1` FOREIGN KEY (`competition_id`) REFERENCES `competition`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `exam_subject` ADD CONSTRAINT `exam_subject_ibfk_1` FOREIGN KEY (`competition_id`) REFERENCES `competition`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `exam_subject` ADD CONSTRAINT `exam_subject_ibfk_2` FOREIGN KEY (`generated_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `exam_subject_exercise` ADD CONSTRAINT `exam_subject_exercise_ibfk_1` FOREIGN KEY (`exam_subject_id`) REFERENCES `exam_subject`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `exam_subject_exercise` ADD CONSTRAINT `exam_subject_exercise_ibfk_2` FOREIGN KEY (`exercise_id`) REFERENCES `exercise`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `exercise` ADD CONSTRAINT `exercise_ibfk_1` FOREIGN KEY (`competition_id`) REFERENCES `competition`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `exercise` ADD CONSTRAINT `exercise_ibfk_2` FOREIGN KEY (`professor_id`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `exercise` ADD CONSTRAINT `exercise_ibfk_3` FOREIGN KEY (`academic_module_id`) REFERENCES `academic_module`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `exercise` ADD CONSTRAINT `fk_exercise_difficulty` FOREIGN KEY (`difficulty_id`) REFERENCES `exercise_difficulty`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `exercise` ADD CONSTRAINT `fk_exercise_file_type` FOREIGN KEY (`file_type_id`) REFERENCES `exercise_file_type`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `exercise_version` ADD CONSTRAINT `exercise_version_ibfk_1` FOREIGN KEY (`exercise_id`) REFERENCES `exercise`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `exercise_version` ADD CONSTRAINT `exercise_version_ibfk_2` FOREIGN KEY (`modified_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `grading_discrepancy` ADD CONSTRAINT `grading_discrepancy_ibfk_1` FOREIGN KEY (`anonymised_copy_id`) REFERENCES `anonymised_copy`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `grading_discrepancy` ADD CONSTRAINT `grading_discrepancy_ibfk_2` FOREIGN KEY (`third_corrector_id`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `professor_selection` ADD CONSTRAINT `professor_selection_ibfk_1` FOREIGN KEY (`competition_id`) REFERENCES `competition`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `professor_selection` ADD CONSTRAINT `professor_selection_ibfk_2` FOREIGN KEY (`professor_id`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `professor_selection` ADD CONSTRAINT `professor_selection_ibfk_3` FOREIGN KEY (`academic_module_id`) REFERENCES `academic_module`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `professor_selection` ADD CONSTRAINT `professor_selection_ibfk_4` FOREIGN KEY (`selected_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `pv` ADD CONSTRAINT `fk_pv_type` FOREIGN KEY (`pv_type_id`) REFERENCES `pv_type`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `pv` ADD CONSTRAINT `pv_ibfk_1` FOREIGN KEY (`competition_id`) REFERENCES `competition`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `pv` ADD CONSTRAINT `pv_ibfk_2` FOREIGN KEY (`generated_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `pv_signature` ADD CONSTRAINT `pv_signature_ibfk_1` FOREIGN KEY (`pv_id`) REFERENCES `pv`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `pv_signature` ADD CONSTRAINT `pv_signature_ibfk_2` FOREIGN KEY (`signer_id`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `ranking` ADD CONSTRAINT `ranking_ibfk_1` FOREIGN KEY (`competition_id`) REFERENCES `competition`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `ranking` ADD CONSTRAINT `ranking_ibfk_2` FOREIGN KEY (`anonymised_copy_id`) REFERENCES `anonymised_copy`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `result_publication` ADD CONSTRAINT `result_publication_ibfk_1` FOREIGN KEY (`competition_id`) REFERENCES `competition`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `result_publication` ADD CONSTRAINT `result_publication_ibfk_2` FOREIGN KEY (`published_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `room_supervisor` ADD CONSTRAINT `room_supervisor_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `exam_room`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `room_supervisor` ADD CONSTRAINT `room_supervisor_ibfk_2` FOREIGN KEY (`supervisor_id`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `subject_generation_rule` ADD CONSTRAINT `subject_generation_rule_ibfk_1` FOREIGN KEY (`competition_id`) REFERENCES `competition`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `subject_generation_rule` ADD CONSTRAINT `subject_generation_rule_ibfk_2` FOREIGN KEY (`configured_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
