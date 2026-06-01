const prisma = require('../config/db');

 async function getGradingSession(anonym_code) {
  const record = await prisma.anonymisation.findUnique({
    where:  { anonym_code },
    select: {
      corr_code: true,
      grade: {
        select: {
          grade_1:        true,
          grade_2:        true,
          grade_3:        true,
          final_grade:    true,
          status:         true,
          corrected_1_at: true,
          corrected_2_at: true,
          corrected_3_at: true
        }
      },
      examSession: {
        select: {
          exam: {
            select: {
              competition: {
                select: { discrepancy_threshold: true }
              }
            }
          }
        }
      }
    }
  });

  if (!record) throw new Error('CODE_NOT_FOUND');

  return {
    corr_code:             record.corr_code,
    status:                record.grade?.status ?? 'PENDING',
    final_grade:           record.grade?.final_grade ?? null,
    discrepancy_threshold: record.examSession?.exam?.competition?.discrepancy_threshold ?? null
  };
}

async function submitGrade(corr_code, grade, correctorId) {
  if (grade < 0 || grade > 20) throw new Error('INVALID_GRADE');

  const record = await prisma.anon_grade.findUnique({
    where:   { corr_code },
    include: {
      anonymisation: {
        include: {
          examSession: {
            include: {
              exam: {
                include: {
                  competition: {
                    select: { discrepancy_threshold: true }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  if (!record) throw new Error('CODE_NOT_FOUND');

  const threshold = Number(
    record.anonymisation?.examSession?.exam?.competition?.discrepancy_threshold ?? 3
  );

  // slot 1
  if (!record.grade_1) {
    return prisma.anon_grade.update({
      where: { corr_code },
      data: {
        grade_1:        grade,
        corrector_1_id: correctorId,
        corrected_1_at: new Date(),
        status:         'FIRST_DONE'
      }
    });
  }

  // slot 2
  if (!record.grade_2) {
    if (record.corrector_1_id === correctorId) throw new Error('SAME_CORRECTOR');

    const discrepancy = Math.abs(record.grade_1 - grade);
    const needsThird  = discrepancy > threshold;

    return prisma.anon_grade.update({
      where: { corr_code },
      data: {
        grade_2:        grade,
        corrector_2_id: correctorId,
        corrected_2_at: new Date(),
        status:         needsThird ? 'THIRD_REQUIRED' : 'COMPLETED',
        final_grade:    needsThird
          ? null
          : parseFloat(((record.grade_1 + grade) / 2).toFixed(2))
      }
    });
  }

  // slot 3
  if (record.status === 'THIRD_REQUIRED' && !record.grade_3) {
    if (record.corrector_1_id === correctorId || record.corrector_2_id === correctorId) {
      throw new Error('SAME_CORRECTOR');
    }

    const final_grade = parseFloat(grade.toFixed(2));

    return prisma.anon_grade.update({
      where: { corr_code },
      data: {
        grade_3:        grade,
        corrector_3_id: correctorId,
        corrected_3_at: new Date(),
        status:         'COMPLETED',
        final_grade
      }
    });
  }

  throw new Error('ALREADY_GRADED');
}

module.exports = { getGradingSession, submitGrade };