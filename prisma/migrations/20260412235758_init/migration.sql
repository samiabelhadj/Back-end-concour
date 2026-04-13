/*
  Warnings:

  - You are about to drop the `anonymisation_key` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `anonymised_copy` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `attendance` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `candidate` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `competition_phase` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `competition_phase_name` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `competition_phase_status` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `correction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `correction_exercise_score` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `corrector_assignment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `deliberation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `deliberation_remark` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `deliberation_status` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `exam_room` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `exam_subject` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `exam_subject_exercise` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `exercise` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `exercise_difficulty` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `exercise_file_type` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `exercise_version` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `grading_discrepancy` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `professor_selection` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `pv` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `pv_signature` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `pv_type` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ranking` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `result_publication` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `room_supervisor` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `subject_generation_rule` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `anonymisation_key` DROP FOREIGN KEY `anonymisation_key_ibfk_1`;

-- DropForeignKey
ALTER TABLE `anonymisation_key` DROP FOREIGN KEY `anonymisation_key_ibfk_2`;

-- DropForeignKey
ALTER TABLE `anonymised_copy` DROP FOREIGN KEY `anonymised_copy_ibfk_1`;

-- DropForeignKey
ALTER TABLE `attendance` DROP FOREIGN KEY `attendance_ibfk_1`;

-- DropForeignKey
ALTER TABLE `attendance` DROP FOREIGN KEY `attendance_ibfk_2`;

-- DropForeignKey
ALTER TABLE `attendance` DROP FOREIGN KEY `attendance_ibfk_3`;

-- DropForeignKey
ALTER TABLE `candidate` DROP FOREIGN KEY `candidate_ibfk_1`;

-- DropForeignKey
ALTER TABLE `candidate` DROP FOREIGN KEY `candidate_ibfk_2`;

-- DropForeignKey
ALTER TABLE `competition_phase` DROP FOREIGN KEY `competition_phase_ibfk_1`;

-- DropForeignKey
ALTER TABLE `competition_phase` DROP FOREIGN KEY `competition_phase_ibfk_2`;

-- DropForeignKey
ALTER TABLE `competition_phase` DROP FOREIGN KEY `fk_competition_phase_name`;

-- DropForeignKey
ALTER TABLE `competition_phase` DROP FOREIGN KEY `fk_competition_phase_status`;

-- DropForeignKey
ALTER TABLE `correction` DROP FOREIGN KEY `correction_ibfk_1`;

-- DropForeignKey
ALTER TABLE `correction_exercise_score` DROP FOREIGN KEY `correction_exercise_score_ibfk_1`;

-- DropForeignKey
ALTER TABLE `correction_exercise_score` DROP FOREIGN KEY `correction_exercise_score_ibfk_2`;

-- DropForeignKey
ALTER TABLE `corrector_assignment` DROP FOREIGN KEY `corrector_assignment_ibfk_1`;

-- DropForeignKey
ALTER TABLE `corrector_assignment` DROP FOREIGN KEY `corrector_assignment_ibfk_2`;

-- DropForeignKey
ALTER TABLE `corrector_assignment` DROP FOREIGN KEY `corrector_assignment_ibfk_3`;

-- DropForeignKey
ALTER TABLE `deliberation` DROP FOREIGN KEY `deliberation_ibfk_1`;

-- DropForeignKey
ALTER TABLE `deliberation` DROP FOREIGN KEY `deliberation_ibfk_2`;

-- DropForeignKey
ALTER TABLE `deliberation` DROP FOREIGN KEY `deliberation_ibfk_3`;

-- DropForeignKey
ALTER TABLE `deliberation` DROP FOREIGN KEY `fk_deliberation_status`;

-- DropForeignKey
ALTER TABLE `deliberation_remark` DROP FOREIGN KEY `deliberation_remark_ibfk_1`;

-- DropForeignKey
ALTER TABLE `deliberation_remark` DROP FOREIGN KEY `deliberation_remark_ibfk_2`;

-- DropForeignKey
ALTER TABLE `exam_room` DROP FOREIGN KEY `exam_room_ibfk_1`;

-- DropForeignKey
ALTER TABLE `exam_subject` DROP FOREIGN KEY `exam_subject_ibfk_1`;

-- DropForeignKey
ALTER TABLE `exam_subject` DROP FOREIGN KEY `exam_subject_ibfk_2`;

-- DropForeignKey
ALTER TABLE `exam_subject_exercise` DROP FOREIGN KEY `exam_subject_exercise_ibfk_1`;

-- DropForeignKey
ALTER TABLE `exam_subject_exercise` DROP FOREIGN KEY `exam_subject_exercise_ibfk_2`;

-- DropForeignKey
ALTER TABLE `exercise` DROP FOREIGN KEY `exercise_ibfk_1`;

-- DropForeignKey
ALTER TABLE `exercise` DROP FOREIGN KEY `exercise_ibfk_2`;

-- DropForeignKey
ALTER TABLE `exercise` DROP FOREIGN KEY `exercise_ibfk_3`;

-- DropForeignKey
ALTER TABLE `exercise` DROP FOREIGN KEY `fk_exercise_difficulty`;

-- DropForeignKey
ALTER TABLE `exercise` DROP FOREIGN KEY `fk_exercise_file_type`;

-- DropForeignKey
ALTER TABLE `exercise_version` DROP FOREIGN KEY `exercise_version_ibfk_1`;

-- DropForeignKey
ALTER TABLE `exercise_version` DROP FOREIGN KEY `exercise_version_ibfk_2`;

-- DropForeignKey
ALTER TABLE `grading_discrepancy` DROP FOREIGN KEY `grading_discrepancy_ibfk_1`;

-- DropForeignKey
ALTER TABLE `grading_discrepancy` DROP FOREIGN KEY `grading_discrepancy_ibfk_2`;

-- DropForeignKey
ALTER TABLE `professor_selection` DROP FOREIGN KEY `professor_selection_ibfk_1`;

-- DropForeignKey
ALTER TABLE `professor_selection` DROP FOREIGN KEY `professor_selection_ibfk_2`;

-- DropForeignKey
ALTER TABLE `professor_selection` DROP FOREIGN KEY `professor_selection_ibfk_3`;

-- DropForeignKey
ALTER TABLE `professor_selection` DROP FOREIGN KEY `professor_selection_ibfk_4`;

-- DropForeignKey
ALTER TABLE `pv` DROP FOREIGN KEY `fk_pv_type`;

-- DropForeignKey
ALTER TABLE `pv` DROP FOREIGN KEY `pv_ibfk_1`;

-- DropForeignKey
ALTER TABLE `pv` DROP FOREIGN KEY `pv_ibfk_2`;

-- DropForeignKey
ALTER TABLE `pv_signature` DROP FOREIGN KEY `pv_signature_ibfk_1`;

-- DropForeignKey
ALTER TABLE `pv_signature` DROP FOREIGN KEY `pv_signature_ibfk_2`;

-- DropForeignKey
ALTER TABLE `ranking` DROP FOREIGN KEY `ranking_ibfk_1`;

-- DropForeignKey
ALTER TABLE `ranking` DROP FOREIGN KEY `ranking_ibfk_2`;

-- DropForeignKey
ALTER TABLE `result_publication` DROP FOREIGN KEY `result_publication_ibfk_1`;

-- DropForeignKey
ALTER TABLE `result_publication` DROP FOREIGN KEY `result_publication_ibfk_2`;

-- DropForeignKey
ALTER TABLE `room_supervisor` DROP FOREIGN KEY `room_supervisor_ibfk_1`;

-- DropForeignKey
ALTER TABLE `room_supervisor` DROP FOREIGN KEY `room_supervisor_ibfk_2`;

-- DropForeignKey
ALTER TABLE `subject_generation_rule` DROP FOREIGN KEY `subject_generation_rule_ibfk_1`;

-- DropForeignKey
ALTER TABLE `subject_generation_rule` DROP FOREIGN KEY `subject_generation_rule_ibfk_2`;

-- DropTable
DROP TABLE `anonymisation_key`;

-- DropTable
DROP TABLE `anonymised_copy`;

-- DropTable
DROP TABLE `attendance`;

-- DropTable
DROP TABLE `candidate`;

-- DropTable
DROP TABLE `competition_phase`;

-- DropTable
DROP TABLE `competition_phase_name`;

-- DropTable
DROP TABLE `competition_phase_status`;

-- DropTable
DROP TABLE `correction`;

-- DropTable
DROP TABLE `correction_exercise_score`;

-- DropTable
DROP TABLE `corrector_assignment`;

-- DropTable
DROP TABLE `deliberation`;

-- DropTable
DROP TABLE `deliberation_remark`;

-- DropTable
DROP TABLE `deliberation_status`;

-- DropTable
DROP TABLE `exam_room`;

-- DropTable
DROP TABLE `exam_subject`;

-- DropTable
DROP TABLE `exam_subject_exercise`;

-- DropTable
DROP TABLE `exercise`;

-- DropTable
DROP TABLE `exercise_difficulty`;

-- DropTable
DROP TABLE `exercise_file_type`;

-- DropTable
DROP TABLE `exercise_version`;

-- DropTable
DROP TABLE `grading_discrepancy`;

-- DropTable
DROP TABLE `professor_selection`;

-- DropTable
DROP TABLE `pv`;

-- DropTable
DROP TABLE `pv_signature`;

-- DropTable
DROP TABLE `pv_type`;

-- DropTable
DROP TABLE `ranking`;

-- DropTable
DROP TABLE `result_publication`;

-- DropTable
DROP TABLE `room_supervisor`;

-- DropTable
DROP TABLE `subject_generation_rule`;
