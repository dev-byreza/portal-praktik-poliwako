import { getDbPool } from '../api/_db.ts';
import { ensureCourseAndPeriodFolders } from '../api/_drive.ts';

async function syncAll() {
  const pool = getDbPool();
  const client = await pool.connect();
  try {
    const rowsRes = await client.query(`
      SELECT
        c.id as course_id,
        c.name as course_name,
        c.academic_year,
        pp.id as period_id,
        pp.name as period_name,
        pp.final_project_drive_url,
        pp.instructor_drive_url
      FROM public.courses c
      JOIN public.practice_periods pp ON pp.course_id = c.id
      ORDER BY c.academic_year, c.name, pp.period_number
    `);

    console.log(`Found ${rowsRes.rows.length} course periods to sync with Academic Year hierarchy...`);

    for (const row of rowsRes.rows) {
      console.log(`\nSyncing [${row.academic_year || 'TA 2026-2027'}] -> [${row.course_name}] -> [${row.period_name}]...`);
      const structure = await ensureCourseAndPeriodFolders(row.course_name, row.period_name, row.academic_year);

      await client.query(`
        UPDATE public.practice_periods
        SET
          final_project_drive_url = $1,
          instructor_drive_url = $2,
          updated_at = NOW()
        WHERE id = $3
      `, [
        structure.studentSubmissionFolder.webViewLink,
        structure.instructorAssignmentFolder.webViewLink,
        row.period_id
      ]);

      await client.query(`
        UPDATE public.courses
        SET
          drive_folder_url = $1,
          master_drive_url = $2,
          updated_at = NOW()
        WHERE id = $3
      `, [
        structure.courseFolder.webViewLink,
        structure.courseMasterFolder.webViewLink,
        row.course_id
      ]);

      console.log(`  ✓ Year Folder: ${structure.yearFolder.name}`);
      console.log(`  ✓ Course Master: ${structure.courseMasterFolder.webViewLink}`);
      console.log(`  ✓ Instructor Assignment Backup: ${structure.instructorAssignmentFolder.webViewLink}`);
      console.log(`  ✓ Student Submissions: ${structure.studentSubmissionFolder.webViewLink}`);
    }

    console.log('\nAll courses and periods successfully organized by Academic Year in Google Drive!');
  } finally {
    client.release();
    await pool.end();
  }
}

syncAll().catch(err => {
  console.error('Sync failed:', err);
  process.exit(1);
});
