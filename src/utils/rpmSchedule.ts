import official from '../data/official-rpm-2026.json';
import { Student, PracticePeriod, PracticeParticipant, PeriodStatus } from '../types';

export function getRpmSchedule(courseId: string) {
  const code = courseId === 'c3d4e5f6-d002-4000-8000-000000000001' ? 'DPP'
    : ['course-cad-1-1', 'a1b2c3d4-cad1-4000-8000-000000000001'].includes(courseId) ? 'CAD1.1' : '';
  return official.courses.find(c => c.code === code);
}

export function rpmPeriodStatus(start: string, end: string, today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(new Date())): PeriodStatus {
  return today < start ? 'UPCOMING' : today > end ? 'COMPLETED' : 'ACTIVE';
}

// Correct only the two courses covered by the PDF. Preserve IDs and learning status.
export function reconcileRpmSchedule(students: Student[], periods: PracticePeriod[], participants: PracticeParticipant[], today?: string) {
  const correctedStudents = [...students];
  for (const course of official.courses) {
    for (const student of course.students) {
      const index = correctedStudents.findIndex(s => s.nim === student.nim);
      if (index >= 0) correctedStudents[index] = { ...correctedStudents[index], ...student };
      else correctedStudents.push({ ...student, id: `std-${student.nim}`, createdAt: '2026-08-01T00:00:00.000Z' });
    }
  }
  const correctedPeriods = periods.map(period => {
    const schedule = getRpmSchedule(period.courseId)?.periods.find(p => p.periodNumber === period.periodNumber);
    return schedule ? { ...period, name: schedule.name, startDate: schedule.startDate, endDate: schedule.endDate,
      autoStatus: true, status: rpmPeriodStatus(schedule.startDate, schedule.endDate, today) } : period;
  });
  const moves: { studentId: string; from: string; to: string }[] = [];
  const correctedParticipants = participants.map(participant => {
    const period = periods.find(p => p.id === participant.periodId);
    if (!period || !getRpmSchedule(period.courseId)) return participant;
    const student = correctedStudents.find(s => s.id === participant.studentId) || participant.student;
    const target = getRpmSchedule(period.courseId)?.periods.find(p => p.nims.includes(student.nim));
    const targetPeriod = target && periods.find(p => p.courseId === period.courseId && p.periodNumber === target.periodNumber);
    if (targetPeriod && targetPeriod.id !== participant.periodId) moves.push({ studentId: participant.studentId, from: participant.periodId, to: targetPeriod.id });
    return { ...participant, student, periodId: targetPeriod?.id || participant.periodId };
  });
  for (const period of correctedPeriods) {
    const schedule = getRpmSchedule(period.courseId)?.periods.find(p => p.periodNumber === period.periodNumber);
    for (const nim of schedule?.nims || []) {
      const student = correctedStudents.find(s => s.nim === nim)!;
      if (!correctedParticipants.some(p => p.periodId === period.id && p.studentId === student.id)) {
        correctedParticipants.push({ id: `part-${period.id}-${nim}`, periodId: period.id, studentId: student.id, student,
          enrolledAt: period.startDate + 'T00:00:00.000Z', progressStatus: 'NOT_STARTED', finalProjectConfirmed: false });
      }
    }
  }
  return { students: correctedStudents, periods: correctedPeriods, participants: correctedParticipants, moves };
}
