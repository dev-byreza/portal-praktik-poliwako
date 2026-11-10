import { getDbPool } from './_db.ts';
import { ensureCourseAndPeriodFolders, uploadFileToDrive } from './_drive.ts';
import { invalidateDataCache } from './data.ts';

function extractDriveId(url?: string): string | null {
  if (!url) return null;
  const folderMatch = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];
  const fileMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return fileMatch[1];
  return null;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, payload } = req.body || {};

  try {
    const pool = getDbPool();

    // ================================================================
    // ACTION: ensure_period_folder
    // ================================================================
    if (action === 'ensure_period_folder') {
      const { courseId, courseName, periodId, periodName, academicYear } = payload || {};
      if (!periodId || !courseName || !periodName) {
        return res.status(400).json({ error: 'periodId, courseName, and periodName are required' });
      }

      const client = await pool.connect();
      let resolvedYear = academicYear;
      if (!resolvedYear && courseId) {
        const cRes = await client.query('SELECT academic_year FROM public.courses WHERE id = $1', [courseId]);
        resolvedYear = cRes.rows[0]?.academic_year || '2026/2027';
      }

      const structure = await ensureCourseAndPeriodFolders(courseName, periodName, resolvedYear);

      // Save URLs to Neon
      try {
        await client.query('BEGIN');

        // Update period
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
          periodId
        ]);

        // Update course if courseId provided
        if (courseId) {
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
            courseId
          ]);
        }

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }

      invalidateDataCache();
      return res.status(200).json({
        success: true,
        structure,
      });
    }

    // ================================================================
    // ACTION: sync_all_courses_and_periods
    // ================================================================
    if (action === 'sync_all_courses_and_periods') {
      const client = await pool.connect();
      const results: any[] = [];
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

        for (const row of rowsRes.rows) {
          try {
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

            results.push({
              courseName: row.course_name,
              periodName: row.period_name,
              studentFolderUrl: structure.studentSubmissionFolder.webViewLink,
              instructorFolderUrl: structure.instructorAssignmentFolder.webViewLink,
              status: 'synced',
            });
          } catch (itemErr: any) {
            results.push({
              courseName: row.course_name,
              periodName: row.period_name,
              error: itemErr.message,
              status: 'failed',
            });
          }
        }
      } finally {
        client.release();
      }

      invalidateDataCache();
      return res.status(200).json({
        success: true,
        results,
      });
    }

    // ================================================================
    // ACTION: upload_submission_file
    // ================================================================
    if (action === 'upload_submission_file') {
      const {
        courseId,
        periodId,
        studentId,
        assignmentId,
        fileName,
        fileBase64,
        mimeType,
        submissionType = 'ASSIGNMENT',
      } = payload || {};

      if (!periodId || !studentId || !fileName || !fileBase64) {
        return res.status(400).json({ error: 'periodId, studentId, fileName, and fileBase64 are required' });
      }

      const client = await pool.connect();
      try {
        // 1. Get period, course, and student details
        const infoRes = await client.query(`
          SELECT
            pp.name as period_name,
            pp.final_project_drive_url,
            c.name as course_name,
            c.id as course_id,
            c.academic_year,
            s.nim,
            s.name as student_name
          FROM public.practice_periods pp
          JOIN public.courses c ON c.id = pp.course_id
          JOIN public.students s ON s.id = $2
          WHERE pp.id = $1
          LIMIT 1
        `, [periodId, studentId]);

        if (!infoRes.rows[0]) {
          return res.status(404).json({ error: 'Data periode atau mahasiswa tidak ditemukan.' });
        }

        const info = infoRes.rows[0];
        let targetFolderUrl = info.final_project_drive_url;
        let targetFolderId = extractDriveId(targetFolderUrl);

        // If folder not created yet, create it on Google Drive
        if (!targetFolderId) {
          const structure = await ensureCourseAndPeriodFolders(info.course_name, info.period_name, info.academic_year);
          targetFolderUrl = structure.studentSubmissionFolder.webViewLink;
          targetFolderId = structure.studentSubmissionFolder.id;

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
            periodId
          ]);
        }

        // Clean file buffer from base64
        const base64Data = fileBase64.replace(/^data:[^;]+;base64,/, '');
        const fileBuffer = Buffer.from(base64Data, 'base64');
        const cleanStudentNim = String(info.nim || '').trim().replace(/[^a-zA-Z0-9_-]/g, '');
        const cleanStudentName = String(info.student_name || '').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
        const safeOriginalName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const driveFileName = `${cleanStudentNim}_${cleanStudentName}_${safeOriginalName}`;

        let finalFileUrl = `data:${mimeType || 'application/octet-stream'};base64,${base64Data}`;
        let driveFile: any = null;
        let storageProvider = 'local_data';

        if (targetFolderId) {
          try {
            driveFile = await uploadFileToDrive(
              targetFolderId,
              driveFileName,
              mimeType || 'application/octet-stream',
              fileBuffer
            );
            if (driveFile?.webViewLink) {
              finalFileUrl = driveFile.webViewLink;
              storageProvider = 'google_drive';
            }
          } catch (uploadErr: any) {
            console.warn('Google Drive direct upload error (falling back to database storage):', uploadErr.message);
          }
        }

        // If it's a final project, also record in practice_participants
        if (submissionType === 'FINAL_PROJECT') {
          await client.query(`
            UPDATE public.practice_participants
            SET
              final_project_url = $1,
              final_project_confirmed = true,
              final_project_confirmed_at = NOW(),
              final_project_review_status = 'PENDING'
            WHERE period_id = $2 AND student_id = $3
          `, [finalFileUrl, periodId, studentId]);
        }

        invalidateDataCache();

        return res.status(200).json({
          success: true,
          fileUrl: finalFileUrl,
          driveUrl: driveFile?.webViewLink || null,
          driveFileId: driveFile?.id || null,
          fileName: driveFileName,
          storageProvider,
        });
      } finally {
        client.release();
      }
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (error: any) {
    console.error('Google Drive handler error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
