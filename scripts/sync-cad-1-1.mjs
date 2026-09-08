import { syncRpmSchedule } from './sync-rpm-schedule.mjs';

// Safe preview by default; add --apply to save verified corrections.
// Existing participants, grades, attendance, and coursework are preserved.
syncRpmSchedule(['CAD1.1']).catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
