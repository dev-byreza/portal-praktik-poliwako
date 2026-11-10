import { getDbPool } from './_db.ts';
import { invalidateDataCache } from './data.ts';
import type pg from 'pg';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, payload } = req.body || {};
  if (!action) {
    return res.status(400).json({ error: 'Action is required' });
  }

  let client: pg.PoolClient | null = null;
  try {
    client = await getDbPool().connect();

    switch (action) {
      // ----------------------------------------------------
      // COURSES
      // ----------------------------------------------------
      case 'save_course': {
        const c = payload?.course;
        if (!c?.id || !c?.name) {
          return res.status(400).json({ error: 'Course id and name are required' });
        }

        await client.query('BEGIN');
        try {
          await client.query(`
            INSERT INTO public.courses (
              id, instructor_id, name, code, academic_year, semester, slug, description, department, status, quality_components, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
              instructor_id = EXCLUDED.instructor_id,
              name = EXCLUDED.name,
              code = EXCLUDED.code,
              academic_year = EXCLUDED.academic_year,
              semester = EXCLUDED.semester,
              slug = EXCLUDED.slug,
              description = EXCLUDED.description,
              department = EXCLUDED.department,
              status = EXCLUDED.status,
              quality_components = EXCLUDED.quality_components,
              updated_at = NOW();
          `, [
            c.id,
            c.instructorId || null,
            c.name,
            c.code,
            c.academicYear,
            c.semester,
            c.slug,
            c.description || '',
            c.department,
            c.status || 'DRAFT',
            JSON.stringify(c.qualityComponents || []),
          ]);

          if (Array.isArray(c.subCpmks)) {
            const subIds = c.subCpmks.map((s: any) => s.id).filter(Boolean);
            if (subIds.length > 0) {
              await client.query(
                'DELETE FROM public.course_sub_cpmk WHERE course_id = $1 AND id != ALL($2::uuid[])',
                [c.id, subIds]
              );
            } else {
              await client.query('DELETE FROM public.course_sub_cpmk WHERE course_id = $1', [c.id]);
            }

            for (const sc of c.subCpmks) {
              await client.query(`
                INSERT INTO public.course_sub_cpmk (id, course_id, code, description, weight_percent)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (id) DO UPDATE SET
                  code = EXCLUDED.code,
                  description = EXCLUDED.description,
                  weight_percent = EXCLUDED.weight_percent;
              `, [sc.id, c.id, sc.code, sc.description || '', sc.weightPercent || null]);
            }
          }

          if (Array.isArray(c.qualityRubrics)) {
            const rubIds = c.qualityRubrics.map((r: any) => r.id).filter(Boolean);
            if (rubIds.length > 0) {
              await client.query(
                'DELETE FROM public.rubric_criteria WHERE course_id = $1 AND id != ALL($2::uuid[])',
                [c.id, rubIds]
              );
            } else {
              await client.query('DELETE FROM public.rubric_criteria WHERE course_id = $1', [c.id]);
            }

            for (const rc of c.qualityRubrics) {
              await client.query(`
                INSERT INTO public.rubric_criteria (
                  id, course_id, sub_cpmk_id, name, scale_1_desc, scale_2_desc, scale_3_desc, scale_4_desc, scale_5_desc
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (id) DO UPDATE SET
                  sub_cpmk_id = EXCLUDED.sub_cpmk_id,
                  name = EXCLUDED.name,
                  scale_1_desc = EXCLUDED.scale_1_desc,
                  scale_2_desc = EXCLUDED.scale_2_desc,
                  scale_3_desc = EXCLUDED.scale_3_desc,
                  scale_4_desc = EXCLUDED.scale_4_desc,
                  scale_5_desc = EXCLUDED.scale_5_desc;
              `, [
                rc.id,
                c.id,
                rc.subCpmkId || null,
                rc.name,
                rc.scale1Desc || '',
                rc.scale2Desc || '',
                rc.scale3Desc || '',
                rc.scale4Desc || '',
                rc.scale5Desc || '',
              ]);
            }
          }

          await client.query('COMMIT');
          invalidateDataCache();
          return res.status(200).json({ success: true, courseId: c.id });
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        }
      }

      case 'delete_course': {
        const { id } = payload || {};
        if (!id) return res.status(400).json({ error: 'Course id required' });
        await client.query('DELETE FROM public.courses WHERE id = $1', [id]);
        invalidateDataCache();
        return res.status(200).json({ success: true });
      }

      // ----------------------------------------------------
      // STUDENTS
      // ----------------------------------------------------
      case 'save_student': {
        const s = payload?.student;
        if (!s?.id || !s?.nim) return res.status(400).json({ error: 'Student id and nim required' });
        await client.query(`
          INSERT INTO public.students (id, nim, name, class_name, email, updated_at)
          VALUES ($1, $2, $3, $4, $5, NOW())
          ON CONFLICT (id) DO UPDATE SET
            nim = EXCLUDED.nim,
            name = EXCLUDED.name,
            class_name = EXCLUDED.class_name,
            email = EXCLUDED.email,
            updated_at = NOW();
        `, [s.id, s.nim, s.name, s.className || '', s.email || null]);
        invalidateDataCache();
        return res.status(200).json({ success: true });
      }

      case 'delete_student': {
        const { id } = payload || {};
        if (!id) return res.status(400).json({ error: 'Student id required' });
        await client.query('DELETE FROM public.students WHERE id = $1', [id]);
        invalidateDataCache();
        return res.status(200).json({ success: true });
      }

      // ----------------------------------------------------
      // PERIODS
      // ----------------------------------------------------
      case 'save_period': {
        const p = payload?.period;
        if (!p?.id || !p?.courseId) return res.status(400).json({ error: 'Period id and courseId required' });
        await client.query(`
          INSERT INTO public.practice_periods (
            id, course_id, name, period_number, start_date, end_date, status,
            final_project_drive_url, final_project_description, final_project_enabled, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            course_id = EXCLUDED.course_id,
            name = EXCLUDED.name,
            period_number = EXCLUDED.period_number,
            start_date = EXCLUDED.start_date,
            end_date = EXCLUDED.end_date,
            status = EXCLUDED.status,
            final_project_drive_url = EXCLUDED.final_project_drive_url,
            final_project_description = EXCLUDED.final_project_description,
            final_project_enabled = EXCLUDED.final_project_enabled,
            updated_at = NOW();
        `, [
          p.id,
          p.courseId,
          p.name,
          p.periodNumber || 1,
          p.startDate,
          p.endDate,
          p.status || 'UPCOMING',
          p.finalProjectDriveUrl || null,
          p.finalProjectDescription || null,
          Boolean(p.finalProjectEnabled),
        ]);
        invalidateDataCache();
        return res.status(200).json({ success: true });
      }

      case 'save_periods_bulk': {
        const periods = payload?.periods || [];
        await client.query('BEGIN');
        try {
          for (const p of periods) {
            await client.query(`
              INSERT INTO public.practice_periods (
                id, course_id, name, period_number, start_date, end_date, status,
                final_project_drive_url, final_project_description, final_project_enabled, updated_at
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()
              )
              ON CONFLICT (id) DO UPDATE SET
                course_id = EXCLUDED.course_id,
                name = EXCLUDED.name,
                period_number = EXCLUDED.period_number,
                start_date = EXCLUDED.start_date,
                end_date = EXCLUDED.end_date,
                status = EXCLUDED.status,
                final_project_drive_url = EXCLUDED.final_project_drive_url,
                final_project_description = EXCLUDED.final_project_description,
                final_project_enabled = EXCLUDED.final_project_enabled,
                updated_at = NOW();
            `, [
              p.id,
              p.courseId,
              p.name,
              p.periodNumber || 1,
              p.startDate,
              p.endDate,
              p.status || 'UPCOMING',
              p.finalProjectDriveUrl || null,
              p.finalProjectDescription || null,
              Boolean(p.finalProjectEnabled),
            ]);
          }
          await client.query('COMMIT');
          invalidateDataCache();
          return res.status(200).json({ success: true });
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        }
      }

      case 'delete_period': {
        const { id } = payload || {};
        if (!id) return res.status(400).json({ error: 'Period id required' });
        await client.query('DELETE FROM public.practice_periods WHERE id = $1', [id]);
        invalidateDataCache();
        return res.status(200).json({ success: true });
      }

      // ----------------------------------------------------
      // PARTICIPANTS
      // ----------------------------------------------------
      case 'save_participant': {
        const part = payload?.participant;
        if (!part?.id || !part?.periodId || !part?.studentId) {
          return res.status(400).json({ error: 'Participant id, periodId, and studentId required' });
        }
        await client.query(`
          INSERT INTO public.practice_participants (
            id, period_id, student_id, enrolled_at, progress_status,
            final_project_submitted_at, final_project_confirmed, final_project_url,
            final_project_review_status, final_project_feedback
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
          )
          ON CONFLICT (id) DO UPDATE SET
            period_id = EXCLUDED.period_id,
            student_id = EXCLUDED.student_id,
            progress_status = EXCLUDED.progress_status,
            final_project_submitted_at = EXCLUDED.final_project_submitted_at,
            final_project_confirmed = EXCLUDED.final_project_confirmed,
            final_project_url = EXCLUDED.final_project_url,
            final_project_review_status = EXCLUDED.final_project_review_status,
            final_project_feedback = EXCLUDED.final_project_feedback;
        `, [
          part.id,
          part.periodId,
          part.studentId,
          part.enrolledAt || new Date().toISOString(),
          part.progressStatus || 'NOT_STARTED',
          part.finalProjectSubmittedAt || null,
          Boolean(part.finalProjectConfirmed),
          part.finalProjectUrl || null,
          part.finalProjectReviewStatus || null,
          part.finalProjectFeedback || null,
        ]);
        invalidateDataCache();
        return res.status(200).json({ success: true });
      }

      case 'delete_participant': {
        const { id } = payload || {};
        if (!id) return res.status(400).json({ error: 'Participant id required' });
        await client.query('DELETE FROM public.practice_participants WHERE id = $1', [id]);
        invalidateDataCache();
        return res.status(200).json({ success: true });
      }

      // ----------------------------------------------------
      // ATTENDANCE
      // ----------------------------------------------------
      case 'save_attendance': {
        const a = payload?.attendance;
        if (!a?.id || !a?.periodId || !a?.studentId) {
          return res.status(400).json({ error: 'Attendance id, periodId, and studentId required' });
        }
        await client.query(`
          INSERT INTO public.attendance_records (
            id, period_id, student_id, day1, day2, day3, day4, day5, percentage, is_eligible, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()
          )
          ON CONFLICT (period_id, student_id) DO UPDATE SET
            day1 = EXCLUDED.day1,
            day2 = EXCLUDED.day2,
            day3 = EXCLUDED.day3,
            day4 = EXCLUDED.day4,
            day5 = EXCLUDED.day5,
            percentage = EXCLUDED.percentage,
            is_eligible = EXCLUDED.is_eligible,
            updated_at = NOW();
        `, [
          a.id,
          a.periodId,
          a.studentId,
          a.day1 || 'ALPA',
          a.day2 || 'ALPA',
          a.day3 || 'ALPA',
          a.day4 || 'ALPA',
          a.day5 || 'ALPA',
          a.percentage !== undefined ? a.percentage : 0,
          a.isEligible !== false,
        ]);
        invalidateDataCache();
        return res.status(200).json({ success: true });
      }

      case 'save_attendance_bulk': {
        const rows = payload?.attendance || [];
        await client.query('BEGIN');
        try {
          for (const a of rows) {
            await client.query(`
              INSERT INTO public.attendance_records (
                id, period_id, student_id, day1, day2, day3, day4, day5, percentage, is_eligible, updated_at
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()
              )
              ON CONFLICT (period_id, student_id) DO UPDATE SET
                day1 = EXCLUDED.day1,
                day2 = EXCLUDED.day2,
                day3 = EXCLUDED.day3,
                day4 = EXCLUDED.day4,
                day5 = EXCLUDED.day5,
                percentage = EXCLUDED.percentage,
                is_eligible = EXCLUDED.is_eligible,
                updated_at = NOW();
            `, [
              a.id,
              a.periodId,
              a.studentId,
              a.day1 || 'ALPA',
              a.day2 || 'ALPA',
              a.day3 || 'ALPA',
              a.day4 || 'ALPA',
              a.day5 || 'ALPA',
              a.percentage !== undefined ? a.percentage : 0,
              a.isEligible !== false,
            ]);
          }
          await client.query('COMMIT');
          invalidateDataCache();
          return res.status(200).json({ success: true });
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        }
      }

      // ----------------------------------------------------
      // LEARNING UNITS
      // ----------------------------------------------------
      case 'save_learning_unit': {
        const u = payload?.unit;
        if (!u?.id || !u?.periodId || !u?.courseId) {
          return res.status(400).json({ error: 'Learning unit id, periodId, and courseId required' });
        }

        await client.query('BEGIN');
        try {
          await client.query(`
            INSERT INTO public.learning_units (
              id, period_id, course_id, unit_number, title, description,
              countdown_enabled, countdown_minutes, countdown_started_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9
            )
            ON CONFLICT (id) DO UPDATE SET
              period_id = EXCLUDED.period_id,
              course_id = EXCLUDED.course_id,
              unit_number = EXCLUDED.unit_number,
              title = EXCLUDED.title,
              description = EXCLUDED.description,
              countdown_enabled = EXCLUDED.countdown_enabled,
              countdown_minutes = EXCLUDED.countdown_minutes,
              countdown_started_at = EXCLUDED.countdown_started_at;
          `, [
            u.id,
            u.periodId,
            u.courseId,
            u.unitNumber || 1,
            u.title,
            u.description || '',
            Boolean(u.countdownEnabled),
            u.countdownMinutes || null,
            u.countdownStartedAt || null,
          ]);

          if (Array.isArray(u.materials)) {
            const matIds = u.materials.map((m: any) => m.id).filter(Boolean);
            if (matIds.length > 0) {
              await client.query(
                'DELETE FROM public.learning_materials WHERE unit_id = $1 AND id != ALL($2::uuid[])',
                [u.id, matIds]
              );
            } else {
              await client.query('DELETE FROM public.learning_materials WHERE unit_id = $1', [u.id]);
            }

            for (const m of u.materials) {
              await client.query(`
                INSERT INTO public.learning_materials (
                  id, unit_id, title, type, content_url, content_text,
                  countdown_enabled, countdown_minutes, countdown_started_at
                ) VALUES (
                  $1, $2, $3, $4, $5, $6, $7, $8, $9
                )
                ON CONFLICT (id) DO UPDATE SET
                  title = EXCLUDED.title,
                  type = EXCLUDED.type,
                  content_url = EXCLUDED.content_url,
                  content_text = EXCLUDED.content_text,
                  countdown_enabled = EXCLUDED.countdown_enabled,
                  countdown_minutes = EXCLUDED.countdown_minutes,
                  countdown_started_at = EXCLUDED.countdown_started_at;
              `, [
                m.id,
                u.id,
                m.title,
                m.type,
                m.fileUrl || m.contentUrl || null,
                m.contentText || null,
                Boolean(m.countdownEnabled),
                m.countdownMinutes || null,
                m.countdownStartedAt || null,
              ]);
            }
          }

          if (Array.isArray(u.assignments)) {
            const assignIds = u.assignments.map((a: any) => a.id).filter(Boolean);
            if (assignIds.length > 0) {
              await client.query(
                'DELETE FROM public.assignments WHERE unit_id = $1 AND id != ALL($2::uuid[])',
                [u.id, assignIds]
              );
            } else {
              await client.query('DELETE FROM public.assignments WHERE unit_id = $1', [u.id]);
            }

            for (const a of u.assignments) {
              await client.query(`
                INSERT INTO public.assignments (
                  id, unit_id, period_id, title, description, deadline, max_score,
                  allowed_file_type, submission_type, countdown_enabled, countdown_minutes, countdown_started_at
                ) VALUES (
                  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
                )
                ON CONFLICT (id) DO UPDATE SET
                  period_id = EXCLUDED.period_id,
                  title = EXCLUDED.title,
                  description = EXCLUDED.description,
                  deadline = EXCLUDED.deadline,
                  max_score = EXCLUDED.max_score,
                  allowed_file_type = EXCLUDED.allowed_file_type,
                  submission_type = EXCLUDED.submission_type,
                  countdown_enabled = EXCLUDED.countdown_enabled,
                  countdown_minutes = EXCLUDED.countdown_minutes,
                  countdown_started_at = EXCLUDED.countdown_started_at;
              `, [
                a.id,
                u.id,
                a.periodId || u.periodId,
                a.title,
                a.description || '',
                a.deadline,
                a.maxScore || 100,
                a.allowedFileType || 'PDF',
                a.submissionType || 'ASSIGNMENT',
                Boolean(a.countdownEnabled),
                a.countdownMinutes || null,
                a.countdownStartedAt || null,
              ]);
            }
          }

          await client.query('COMMIT');
          invalidateDataCache();
          return res.status(200).json({ success: true, unitId: u.id });
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        }
      }

      case 'delete_learning_unit': {
        const { id } = payload || {};
        if (!id) return res.status(400).json({ error: 'Learning unit id required' });
        await client.query('DELETE FROM public.learning_units WHERE id = $1', [id]);
        invalidateDataCache();
        return res.status(200).json({ success: true });
      }

      case 'update_countdown': {
        const { target, id, countdownEnabled, countdownMinutes, countdownStartedAt } = payload || {};
        if (!target || !id) return res.status(400).json({ error: 'Target and id required' });

        const table =
          target === 'unit'
            ? 'public.learning_units'
            : target === 'material'
            ? 'public.learning_materials'
            : 'public.assignments';

        await client.query(`
          UPDATE ${table}
          SET countdown_enabled = $1, countdown_minutes = $2, countdown_started_at = $3
          WHERE id = $4
        `, [Boolean(countdownEnabled), countdownMinutes || null, countdownStartedAt || null, id]);

        invalidateDataCache();
        return res.status(200).json({ success: true });
      }

      // ----------------------------------------------------
      // SUBMISSIONS
      // ----------------------------------------------------
      case 'save_submission': {
        const s = payload?.submission;
        if (!s?.id || !s?.assignmentId || !s?.studentId || !s?.periodId) {
          return res.status(400).json({ error: 'Submission id, assignmentId, studentId, and periodId required' });
        }

        const subRes = await client.query(`
          INSERT INTO public.submissions (
            id, assignment_id, student_id, period_id, file_name, file_url, file_size,
            storage_path, submitted_at, status, submission_type, review_feedback, reviewed_at, revision_number
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
          )
          ON CONFLICT (id) DO UPDATE SET
            file_name = EXCLUDED.file_name,
            file_url = EXCLUDED.file_url,
            file_size = EXCLUDED.file_size,
            storage_path = EXCLUDED.storage_path,
            submitted_at = EXCLUDED.submitted_at,
            status = EXCLUDED.status,
            submission_type = EXCLUDED.submission_type,
            review_feedback = EXCLUDED.review_feedback,
            reviewed_at = EXCLUDED.reviewed_at,
            revision_number = EXCLUDED.revision_number
          RETURNING submitted_at;
        `, [
          s.id,
          s.assignmentId,
          s.studentId,
          s.periodId,
          s.fileName,
          s.fileUrl || '',
          s.fileSize || null,
          s.storagePath || null,
          s.submittedAt || new Date().toISOString(),
          s.status || 'SUBMITTED',
          s.submissionType || 'ASSIGNMENT',
          s.reviewFeedback || null,
          s.reviewedAt || null,
          s.revisionNumber || 1,
        ]);

        invalidateDataCache();
        return res.status(200).json({
          success: true,
          submittedAt: subRes.rows[0]?.submitted_at || s.submittedAt,
        });
      }

      case 'review_submission': {
        const { id, status, reviewFeedback, reviewedAt, revisionNumber } = payload || {};
        if (!id) return res.status(400).json({ error: 'Submission id required' });

        const revRes = await client.query(`
          UPDATE public.submissions
          SET status = $1, review_feedback = $2, reviewed_at = $3, revision_number = $4
          WHERE id = $5
          RETURNING status, review_feedback, reviewed_at, revision_number;
        `, [status, reviewFeedback || null, reviewedAt || new Date().toISOString(), revisionNumber || 1, id]);

        invalidateDataCache();
        return res.status(200).json({
          success: true,
          submission: revRes.rows[0],
        });
      }

      // ----------------------------------------------------
      // ASSESSMENTS
      // ----------------------------------------------------
      case 'save_assessment': {
        const a = payload?.assessment;
        if (!a?.id || !a?.periodId || !a?.studentId) {
          return res.status(400).json({ error: 'Assessment id, periodId, and studentId required' });
        }

        await client.query(`
          INSERT INTO public.assessments (
            id, period_id, student_id, quality_score, entry_behavior_score,
            sub_cpmk_practice_score, assignment_score, post_test_score, post_test_file_url,
            attitude_score, creativity_score, report_score, final_score, feedback,
            is_published, published_at, graded_at, quality_scores, attitude_scores,
            creativity_scores, report_scores, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
            $18::jsonb, $19::jsonb, $20::jsonb, $21::jsonb, NOW()
          )
          ON CONFLICT (period_id, student_id) DO UPDATE SET
            quality_score = EXCLUDED.quality_score,
            entry_behavior_score = EXCLUDED.entry_behavior_score,
            sub_cpmk_practice_score = EXCLUDED.sub_cpmk_practice_score,
            assignment_score = EXCLUDED.assignment_score,
            post_test_score = EXCLUDED.post_test_score,
            post_test_file_url = EXCLUDED.post_test_file_url,
            attitude_score = EXCLUDED.attitude_score,
            creativity_score = EXCLUDED.creativity_score,
            report_score = EXCLUDED.report_score,
            final_score = EXCLUDED.final_score,
            feedback = EXCLUDED.feedback,
            is_published = EXCLUDED.is_published,
            published_at = EXCLUDED.published_at,
            graded_at = EXCLUDED.graded_at,
            quality_scores = EXCLUDED.quality_scores,
            attitude_scores = EXCLUDED.attitude_scores,
            creativity_scores = EXCLUDED.creativity_scores,
            report_scores = EXCLUDED.report_scores,
            updated_at = NOW();
        `, [
          a.id,
          a.periodId,
          a.studentId,
          a.qualityScore || 0,
          a.entryBehaviorScore || 0,
          a.subCpmkPracticeScore || 0,
          a.assignmentScore || 0,
          a.postTestScore || 0,
          a.postTestFileUrl || null,
          a.attitudeScore || 0,
          a.creativityScore || 0,
          a.reportScore || 0,
          a.finalScore || 0,
          a.feedback || '',
          Boolean(a.isPublished),
          a.publishedAt || null,
          a.gradedAt || new Date().toISOString(),
          JSON.stringify(a.qualityScores || {}),
          JSON.stringify(a.attitudeScores || {}),
          JSON.stringify(a.creativityScores || {}),
          JSON.stringify(a.reportScores || {}),
        ]);

        invalidateDataCache();
        return res.status(200).json({ success: true });
      }

      case 'save_assessments_bulk': {
        const rows = payload?.assessments || [];
        await client.query('BEGIN');
        try {
          for (const a of rows) {
            await client.query(`
              INSERT INTO public.assessments (
                id, period_id, student_id, quality_score, entry_behavior_score,
                sub_cpmk_practice_score, assignment_score, post_test_score, post_test_file_url,
                attitude_score, creativity_score, report_score, final_score, feedback,
                is_published, published_at, graded_at, quality_scores, attitude_scores,
                creativity_scores, report_scores, updated_at
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
                $18::jsonb, $19::jsonb, $20::jsonb, $21::jsonb, NOW()
              )
              ON CONFLICT (period_id, student_id) DO UPDATE SET
                quality_score = EXCLUDED.quality_score,
                entry_behavior_score = EXCLUDED.entry_behavior_score,
                sub_cpmk_practice_score = EXCLUDED.sub_cpmk_practice_score,
                assignment_score = EXCLUDED.assignment_score,
                post_test_score = EXCLUDED.post_test_score,
                post_test_file_url = EXCLUDED.post_test_file_url,
                attitude_score = EXCLUDED.attitude_score,
                creativity_score = EXCLUDED.creativity_score,
                report_score = EXCLUDED.report_score,
                final_score = EXCLUDED.final_score,
                feedback = EXCLUDED.feedback,
                is_published = EXCLUDED.is_published,
                published_at = EXCLUDED.published_at,
                graded_at = EXCLUDED.graded_at,
                quality_scores = EXCLUDED.quality_scores,
                attitude_scores = EXCLUDED.attitude_scores,
                creativity_scores = EXCLUDED.creativity_scores,
                report_scores = EXCLUDED.report_scores,
                updated_at = NOW();
            `, [
              a.id,
              a.periodId,
              a.studentId,
              a.qualityScore || 0,
              a.entryBehaviorScore || 0,
              a.subCpmkPracticeScore || 0,
              a.assignmentScore || 0,
              a.postTestScore || 0,
              a.postTestFileUrl || null,
              a.attitudeScore || 0,
              a.creativityScore || 0,
              a.reportScore || 0,
              a.finalScore || 0,
              a.feedback || '',
              Boolean(a.isPublished),
              a.publishedAt || null,
              a.gradedAt || new Date().toISOString(),
              JSON.stringify(a.qualityScores || {}),
              JSON.stringify(a.attitudeScores || {}),
              JSON.stringify(a.creativityScores || {}),
              JSON.stringify(a.reportScores || {}),
            ]);
          }
          await client.query('COMMIT');
          invalidateDataCache();
          return res.status(200).json({ success: true });
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        }
      }

      // ----------------------------------------------------
      // ANNOUNCEMENTS
      // ----------------------------------------------------
      case 'save_announcement': {
        const an = payload?.announcement;
        if (!an?.id || !an?.courseId || !an?.title) {
          return res.status(400).json({ error: 'Announcement id, courseId, and title required' });
        }

        await client.query(`
          INSERT INTO public.announcements (
            id, course_id, period_id, title, message, priority, is_active, published_at, expires_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9
          )
          ON CONFLICT (id) DO UPDATE SET
            course_id = EXCLUDED.course_id,
            period_id = EXCLUDED.period_id,
            title = EXCLUDED.title,
            message = EXCLUDED.message,
            priority = EXCLUDED.priority,
            is_active = EXCLUDED.is_active,
            published_at = EXCLUDED.published_at,
            expires_at = EXCLUDED.expires_at;
        `, [
          an.id,
          an.courseId,
          an.periodId || null,
          an.title,
          an.message || '',
          an.priority || 'INFO',
          an.isActive !== false,
          an.publishedAt || an.createdAt || new Date().toISOString(),
          an.expiresAt || null,
        ]);

        invalidateDataCache();
        return res.status(200).json({ success: true });
      }

      case 'delete_announcement': {
        const { id } = payload || {};
        if (!id) return res.status(400).json({ error: 'Announcement id required' });
        await client.query('DELETE FROM public.announcements WHERE id = $1', [id]);
        invalidateDataCache();
        return res.status(200).json({ success: true });
      }

      // ----------------------------------------------------
      // REMEDIALS
      // ----------------------------------------------------
      case 'save_remedial': {
        const r = payload?.remedial;
        if (!r?.id || !r?.periodId || !r?.studentId) {
          return res.status(400).json({ error: 'Remedial id, periodId, and studentId required' });
        }

        await client.query(`
          INSERT INTO public.remedial_assignments (
            id, period_id, student_id, assignment_id, title, description, deadline,
            status, remedial_description, submission_file_name, submission_file_url,
            submitted_at, reviewed_at, submission_storage_path, created_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            deadline = EXCLUDED.deadline,
            status = EXCLUDED.status,
            remedial_description = EXCLUDED.remedial_description,
            submission_file_name = EXCLUDED.submission_file_name,
            submission_file_url = EXCLUDED.submission_file_url,
            submitted_at = EXCLUDED.submitted_at,
            reviewed_at = EXCLUDED.reviewed_at,
            submission_storage_path = EXCLUDED.submission_storage_path;
        `, [
          r.id,
          r.periodId,
          r.studentId,
          r.assignmentId || null,
          r.title || 'Remedial Praktik',
          r.description || '',
          r.deadline || null,
          r.status || 'PENDING',
          r.remedialDescription || '',
          r.submissionFileName || null,
          r.submissionFileUrl || null,
          r.submittedAt || null,
          r.reviewedAt || null,
          r.submissionStoragePath || null,
        ]);

        invalidateDataCache();
        return res.status(200).json({ success: true });
      }

      case 'update_remedial_status': {
        const { id, status, reviewedAt } = payload || {};
        if (!id) return res.status(400).json({ error: 'Remedial id required' });

        await client.query(`
          UPDATE public.remedial_assignments
          SET status = $1, reviewed_at = $2
          WHERE id = $3
        `, [status, reviewedAt || new Date().toISOString(), id]);

        invalidateDataCache();
        return res.status(200).json({ success: true });
      }

      // ----------------------------------------------------
      // QUIZZES
      // ----------------------------------------------------
      case 'submit_quiz': {
        const { sessionToken, materialId, periodId, answers } = payload || {};
        if (!sessionToken || !materialId || !periodId) {
          return res.status(400).json({ error: 'sessionToken, materialId, periodId required' });
        }

        const quizRes = await client.query(
          'SELECT public.submit_quiz_attempt($1, $2, $3, $4::jsonb) as result',
          [
            sessionToken,
            materialId,
            periodId,
            JSON.stringify(
              Array.isArray(answers)
                ? answers
                : Object.entries(answers || {}).map(([questionId, optionId]) => ({ questionId, optionId }))
            ),
          ]
        );

        return res.status(200).json(quizRes.rows[0]?.result || null);
      }

      case 'get_quiz_attempt': {
        const { sessionToken, materialId, periodId } = payload || {};
        if (!sessionToken || !materialId || !periodId) {
          return res.status(400).json({ error: 'sessionToken, materialId, periodId required' });
        }

        const quizRes = await client.query(
          'SELECT public.get_student_quiz_attempt($1, $2, $3) as result',
          [sessionToken, materialId, periodId]
        );

        return res.status(200).json(quizRes.rows[0]?.result || null);
      }

      default:
        return res.status(400).json({ error: 'Unknown action: ' + action });
    }
  } catch (error: any) {
    console.error(`Neon mutation error [action=${action}]:`, error);
    return res.status(500).json({ error: 'Gagal menyimpan ke database Neon: ' + error.message });
  } finally {
    if (client) client.release();
  }
}
