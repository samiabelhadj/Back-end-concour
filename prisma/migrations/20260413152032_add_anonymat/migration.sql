-- AlterTable
ALTER TABLE `user_role` MODIFY `role` ENUM('admin', 'professor_creator', 'corrector', 'supervisor', 'jury', 'coordinator', 'anonymat') NULL;
