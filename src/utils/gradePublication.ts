import { Assessment, AttendanceRecord, RemedialAssignment } from '../types';

export interface PeriodPublicationResult {
  assessments: Assessment[];
  publishedCount: number;
  blockedCount: number;
}

/** Build a publish snapshot without mutating source state; a score of zero is still a saved assessment. */
export function preparePeriodGradePublication(
  assessments: Assessment[],
  periodId: string,
  attendance: AttendanceRecord[],
  remedials: RemedialAssignment[],
  publishedAt = new Date().toISOString(),
): PeriodPublicationResult {
  let publishedCount = 0;
  let blockedCount = 0;

  const updated = assessments.map(assessment => {
    if (assessment.periodId !== periodId || !Number.isFinite(assessment.finalScore)) return assessment;
    const attendanceRecord = attendance.find(record => record.periodId === periodId && record.studentId === assessment.studentId);
    const eligibleByAttendance = attendanceRecord ? attendanceRecord.isEligible : true;
    const studentRemedials = remedials.filter(item => item.periodId === periodId && item.studentId === assessment.studentId);
    const eligibleByRemedial = studentRemedials.length > 0 && studentRemedials.every(item => item.status === 'LULUS');
    const canPublish = eligibleByAttendance || eligibleByRemedial;

    if (canPublish) {
      publishedCount += 1;
      return { ...assessment, isPublished: true, publishedAt };
    }
    blockedCount += 1;
    return { ...assessment, isPublished: false };
  });

  return { assessments: updated, publishedCount, blockedCount };
}

export function preparePeriodGradeUnpublication(assessments: Assessment[], periodId: string): Assessment[] {
  return assessments.map(assessment => assessment.periodId === periodId
    ? { ...assessment, isPublished: false }
    : assessment);
}
