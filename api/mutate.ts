import { getDbPool } from './_db.js';
import { invalidateDataCache } from './data.js';
import crypto from 'node:crypto';
import type pg from 'pg';

const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || '').trim());

const ensureUuid = (id: string | undefined | null, kind: string): string => {
  const raw = String(id || '').trim();
  if (isUuid(raw)) return raw;
  const seed = raw || `${kind}-${Date.now()}-${Math.random()}`;
  const bytes = Buffer.from(crypto.createHash('sha256').update(`${kind}:${seed}`).digest().subarray(0, 16));
  bytes[6] = (bytes[6] & 15) | 128;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = bytes.toString('hex');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
};

const normalizeDeadline = (value: string | undefined | null): string => {
  const raw = String(value || '').trim();
  if (!raw) return new Date().toISOString();
  const normalized = raw
    .replace(/\s*WITA\s*$/i, '+08:00')
    .replace(
      /^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})(?::(\d{2}))?([+-]\d{2}:\d{2})?$/,
      (_match: string, date: string, time: string, seconds?: string, timezone?: string) =>
        `${date}T${time}:${seconds || '00'}${timezone || '+08:00'}`
    );
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
};

const DEFAULT_INSTRUCTOR_ID = '4b83c7b0-6293-428c-8c6c-840ec3210e38';

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
        const courseId = ensureUuid(c.id, 'course');
        const instructorId = isUuid(c.instructorId) ? c.instructorId : DEFAULT_INSTRUCTOR_ID;

        await client.query('BEGIN');
        try {
          await client.query(`
            INSERT INTO public.courses (
              id, instructor_id, name, code, academic_year, semester, slug, description, department, status, quality_components, drive_folder_url, master_drive_url, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13, NOW()
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
              drive_folder_url = COALESCE(EXCLUDED.drive_folder_url, public.courses.drive_folder_url),
              master_drive_url = COALESCE(EXCLUDED.master_drive_url, public.courses.master_drive_url),
              updated_at = NOW();
          `, [
            courseId,
            instructorId,
            c.name,
            c.code || 'MES-100',
            c.academicYear || '2026/2027',
            c.semester || 'Ganjil',
            c.slug || `course-${Date.now()}`,
            c.description || '',
            c.department || 'Rekayasa Perancangan Mekanik',
            c.status || 'PUBLISHED',
            JSON.stringify(c.qualityComponents || []),
            c.driveFolderUrl || null,
            c.masterDriveUrl || null,
          ]);

          const subIdMap = new Map<string, string>();
          if (Array.isArray(c.subCpmks)) {
            const normalizedSubCpmks = c.subCpmks.map((sc: any) => {
              const dbSubId = ensureUuid(sc.id, `${courseId}:sub-cpmk`);
              subIdMap.set(sc.id, dbSubId);
              return { ...sc, id: dbSubId };
            });
            const subIds = normalizedSubCpmks.map((s: any) => s.id).filter(Boolean);
            if (subIds.length > 0) {
              await client.query(
                'DELETE FROM public.course_sub_cpmk WHERE course_id = $1 AND id != ALL($2::uuid[])',
                [courseId, subIds]
              );
            } else {
              await client.query('DELETE FROM public.course_sub_cpmk WHERE course_id = $1', [courseId]);
            }

            for (const sc of normalizedSubCpmks) {
              await client.query(`
                INSERT INTO public.course_sub_cpmk (id, course_id, code, description, weight_percent)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (id) DO UPDATE SET
                  code = EXCLUDED.code,
                  description = EXCLUDED.description,
                  weight_percent = EXCLUDED.weight_percent;
              `, [sc.id, courseId, sc.code, sc.description || '', sc.weightPercent ?? null]);
            }
          }

          if (Array.isArray(c.qualityRubrics)) {
            const normalizedRubrics = c.qualityRubrics.map((rc: any) => ({
              ...rc,
              id: ensureUuid(rc.id, `${courseId}:rubric`),
              subCpmkId: rc.subCpmkId
                ? (subIdMap.get(rc.subCpmkId) || (isUuid(rc.subCpmkId) ? rc.subCpmkId : ensureUuid(rc.subCpmkId, `${courseId}:sub-cpmk`)))
                : null,
            }));
            const rubIds = normalizedRubrics.map((r: any) => r.id).filter(Boolean);
            if (rubIds.length > 0) {
              await client.query(
                'DELETE FROM public.rubric_criteria WHERE course_id = $1 AND id != ALL($2::uuid[])',
                [courseId, rubIds]
              );
            } else {
              await client.query('DELETE FROM public.rubric_criteria WHERE course_id = $1', [courseId]);
            }

            for (const rc of normalizedRubrics) {
              await client.query(`
                INSERT INTO public.rubric_criteria (
                  id, course_id, sub_cpmk_id, name, category, description
                ) VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (id) DO UPDATE SET
                  sub_cpmk_id = EXCLUDED.sub_cpmk_id,
                  name = EXCLUDED.name,
                  category = EXCLUDED.category,
                  description = EXCLUDED.description;
              `, [
                rc.id,
                courseId,
                rc.subCpmkId || null,
                rc.name,
                rc.category || 'QUALITY',
                rc.description || '',
              ]);
            }
          }

          await client.query('COMMIT');
          invalidateDataCache();
          return res.status(200).json({ success: true, courseId });
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        }
      }

      case 'delete_course': {
        const { id } = payload || {};
        if (!id) return res.status(400).json({ error: 'Course id required' });
        await client.query('DELETE FROM public.courses WHERE id = $1', [ensureUuid(id, 'course')]);
        invalidateDataCache();
        return res.status(200).json({ success: true });
      }

      // ----------------------------------------------------
      // STUDENTS
      // ----------------------------------------------------
      case 'save_student': {
        const s = payload?.student;
        if (!s?.id || !s?.nim) return res.status(400).json({ error: 'Student id and nim required' });
        const studentId = ensureUuid(s.id, 'student');
        const instructorId = isUuid(payload?.instructorId)
          ? payload.instructorId
          : isUuid(s.instructorId)
          ? s.instructorId
          : DEFAULT_INSTRUCTOR_ID;
        await client.query(`
          INSERT INTO public.students (id, instructor_id, nim, name, class_name, email, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW())
          ON CONFLICT (id) DO UPDATE SET
            nim = EXCLUDED.nim,
            name = EXCLUDED.name,
            class_name = EXCLUDED.class_name,
            email = EXCLUDED.email,
            updated_at = NOW();
        `, [studentId, instructorId, s.nim, s.name, s.className || '', s.email || null]);
        invalidateDataCache();
        return res.status(200).json({ success: true });
      }

      case 'delete_student': {
        const { id } = payload || {};
        if (!id) return res.status(400).json({ error: 'Student id required' });
        await client.query('DELETE FROM public.students WHERE id = $1', [ensureUuid(id, 'student')]);
        invalidateDataCache();
        return res.status(200).json({ success: true });
      }

      // ----------------------------------------------------
      // PERIODS
      // ----------------------------------------------------
      case 'save_period': {
        const p = payload?.period;
        if (!p?.id || !p?.courseId) return res.status(400).json({ error: 'Period id and courseId required' });
        const periodId = ensureUuid(p.id, 'period');
        const courseId = ensureUuid(p.courseId, 'course');
        await client.query(`
          INSERT INTO public.practice_periods (
            id, course_id, name, period_number, start_date, end_date, status,
            final_project_drive_url, instructor_drive_url, final_project_description, final_project_enabled, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            course_id = EXCLUDED.course_id,
            name = EXCLUDED.name,
            period_number = EXCLUDED.period_number,
            start_date = EXCLUDED.start_date,
            end_date = EXCLUDED.end_date,
            status = EXCLUDED.status,
            final_project_drive_url = EXCLUDED.final_project_drive_url,
            instructor_drive_url = COALESCE(EXCLUDED.instructor_drive_url, public.practice_periods.instructor_drive_url),
            final_project_description = EXCLUDED.final_project_description,
            final_project_enabled = EXCLUDED.final_project_enabled,
            updated_at = NOW();
        `, [
          periodId,
          courseId,
          p.name,
          p.periodNumber || 1,
          p.startDate,
          p.endDate,
          p.status || 'UPCOMING',
          p.finalProjectDriveUrl || null,
          p.instructorDriveUrl || null,
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
            const periodId = ensureUuid(p.id, 'period');
            const courseId = ensureUuid(p.courseId, 'course');
            await client.query(`
              INSERT INTO public.practice_periods (
                id, course_id, name, period_number, start_date, end_date, status,
                final_project_drive_url, instructor_drive_url, final_project_description, final_project_enabled, updated_at
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()
              )
              ON CONFLICT (id) DO UPDATE SET
                course_id = EXCLUDED.course_id,
                name = EXCLUDED.name,
                period_number = EXCLUDED.period_number,
                start_date = EXCLUDED.start_date,
                end_date = EXCLUDED.end_date,
                status = EXCLUDED.status,
                final_project_drive_url = EXCLUDED.final_project_drive_url,
                instructor_drive_url = COALESCE(EXCLUDED.instructor_drive_url, public.practice_periods.instructor_drive_url),
                final_project_description = EXCLUDED.final_project_description,
                final_project_enabled = EXCLUDED.final_project_enabled,
                updated_at = NOW();
            `, [
              periodId,
              courseId,
              p.name,
              p.periodNumber || 1,
              p.startDate,
              p.endDate,
              p.status || 'UPCOMING',
              p.finalProjectDriveUrl || null,
              p.instructorDriveUrl || null,
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
        await client.query('DELETE FROM public.practice_periods WHERE id = $1', [ensureUuid(id, 'period')]);
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
        const partId = ensureUuid(part.id, 'participant');
        const periodId = ensureUuid(part.periodId, 'period');
        const studentId = ensureUuid(part.studentId, 'student');
        await client.query(`
          INSERT INTO public.practice_participants (
            id, period_id, student_id, enrolled_at, progress_status,
            final_project_submitted_at, final_project_confirmed, final_project_url,
            final_project_review_status, final_project_feedback
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
          )
          ON CONFLICT (period_id, student_id) DO UPDATE SET
            progress_status = EXCLUDED.progress_status,
            final_project_submitted_at = EXCLUDED.final_project_submitted_at,
            final_project_confirmed = EXCLUDED.final_project_confirmed,
            final_project_url = EXCLUDED.final_project_url,
            final_project_review_status = EXCLUDED.final_project_review_status,
            final_project_feedback = EXCLUDED.final_project_feedback;
        `, [
          partId,
          periodId,
          studentId,
          part.enrolledAt ? normalizeDeadline(part.enrolledAt) : new Date().toISOString(),
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
        await client.query('DELETE FROM public.practice_participants WHERE id = $1', [ensureUuid(id, 'participant')]);
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
        const attId = ensureUuid(a.id, `attendance:${a.periodId}:${a.studentId}`);
        const periodId = ensureUuid(a.periodId, 'period');
        const studentId = ensureUuid(a.studentId, 'student');
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
          attId,
          periodId,
          studentId,
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
            const attId = ensureUuid(a.id, `attendance:${a.periodId}:${a.studentId}`);
            const periodId = ensureUuid(a.periodId, 'period');
            const studentId = ensureUuid(a.studentId, 'student');
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
              attId,
              periodId,
              studentId,
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

      case 'delete_attendance': {
        const { periodId, studentId } = payload || {};
        if (!periodId || !studentId) {
          return res.status(400).json({ error: 'periodId and studentId required' });
        }
        await client.query(
          'DELETE FROM public.attendance_records WHERE period_id = $1 AND student_id = $2',
          [ensureUuid(periodId, 'period'), ensureUuid(studentId, 'student')]
        );
        invalidateDataCache();
        return res.status(200).json({ success: true });
      }

      // ----------------------------------------------------
      // LEARNING UNITS
      // ----------------------------------------------------
      case 'save_learning_unit': {
        const u = payload?.unit;
        if (!u?.id || !u?.periodId) {
          return res.status(400).json({ error: 'Learning unit id and periodId required' });
        }

        const unitId = ensureUuid(u.id, 'learning-unit');
        const periodId = ensureUuid(u.periodId, 'period');

        await client.query('BEGIN');
        try {
          await client.query(`
            INSERT INTO public.learning_units (
              id, period_id, unit_number, title, description,
              countdown_enabled, countdown_minutes, countdown_started_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8
            )
            ON CONFLICT (id) DO UPDATE SET
              period_id = EXCLUDED.period_id,
              unit_number = EXCLUDED.unit_number,
              title = EXCLUDED.title,
              description = EXCLUDED.description,
              countdown_enabled = EXCLUDED.countdown_enabled,
              countdown_minutes = EXCLUDED.countdown_minutes,
              countdown_started_at = EXCLUDED.countdown_started_at;
          `, [
            unitId,
            periodId,
            Number(u.unitNumber) || 1,
            u.title || 'Unit Praktik',
            u.description || '',
            Boolean(u.countdownEnabled),
            u.countdownEnabled ? Math.max(1, Number(u.countdownMinutes) || 1) : (Number(u.countdownMinutes) || 0),
            u.countdownEnabled ? (u.countdownStartedAt || new Date().toISOString()) : null,
          ]);

          if (Array.isArray(u.materials)) {
            const normalizedMaterials = u.materials.map((m: any, idx: number) => ({
              ...m,
              id: ensureUuid(m.id, `learning-material:${u.id}`),
              createdAt: m.createdAt || new Date(Date.now() + idx).toISOString(),
            }));
            const matIds = normalizedMaterials.map((m: any) => m.id).filter(Boolean);
            if (matIds.length > 0) {
              await client.query(
                'DELETE FROM public.learning_materials WHERE unit_id = $1 AND id != ALL($2::uuid[])',
                [unitId, matIds]
              );
            } else {
              await client.query('DELETE FROM public.learning_materials WHERE unit_id = $1', [unitId]);
            }

            for (const m of normalizedMaterials) {
              const contentText = m.type === 'QUIZ'
                ? (m.quiz?.description?.trim() || m.contentText || null)
                : (m.contentText || null);
              await client.query(`
                INSERT INTO public.learning_materials (
                  id, unit_id, title, type, content_url, content_text, file_size, created_at,
                  countdown_enabled, countdown_minutes, countdown_started_at
                ) VALUES (
                  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
                )
                ON CONFLICT (id) DO UPDATE SET
                  unit_id = EXCLUDED.unit_id,
                  title = EXCLUDED.title,
                  type = EXCLUDED.type,
                  content_url = EXCLUDED.content_url,
                  content_text = EXCLUDED.content_text,
                  file_size = EXCLUDED.file_size,
                  created_at = EXCLUDED.created_at,
                  countdown_enabled = EXCLUDED.countdown_enabled,
                  countdown_minutes = EXCLUDED.countdown_minutes,
                  countdown_started_at = EXCLUDED.countdown_started_at;
              `, [
                m.id,
                unitId,
                m.title || 'Materi Pembelajaran',
                m.type || 'RICHTEXT',
                m.contentUrl || m.fileUrl || null,
                contentText,
                m.fileSize || null,
                m.createdAt,
                Boolean(m.countdownEnabled),
                m.countdownEnabled ? Math.max(1, Number(m.countdownMinutes) || 1) : (Number(m.countdownMinutes) || 0),
                m.countdownEnabled ? (m.countdownStartedAt || new Date().toISOString()) : null,
              ]);

              // Sync Quiz Definition, Questions & Options
              if (m.type === 'QUIZ' && m.quiz) {
                const quiz = m.quiz;
                const quizId = ensureUuid(m.id, 'quiz-definition');
                await client.query(`
                  INSERT INTO public.quiz_definitions (
                    id, material_id, description, shuffle_questions, pass_score, max_attempts, updated_at
                  ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
                  ON CONFLICT (material_id) DO UPDATE SET
                    description = EXCLUDED.description,
                    shuffle_questions = EXCLUDED.shuffle_questions,
                    pass_score = EXCLUDED.pass_score,
                    max_attempts = EXCLUDED.max_attempts,
                    updated_at = NOW();
                `, [
                  quizId,
                  m.id,
                  quiz.description || null,
                  Boolean(quiz.shuffleQuestions),
                  Math.min(100, Math.max(0, Number(quiz.passScore ?? 70))),
                  Math.max(0, Number(quiz.maxAttempts ?? 0)),
                ]);

                const quizRowRes = await client.query(
                  'SELECT id FROM public.quiz_definitions WHERE material_id = $1 LIMIT 1',
                  [m.id]
                );
                const actualQuizId = quizRowRes.rows[0]?.id || quizId;

                const existingQRes = await client.query(
                  'SELECT id FROM public.quiz_questions WHERE quiz_id = $1',
                  [actualQuizId]
                );
                const existingQIds = existingQRes.rows.map((r: any) => r.id);
                if (existingQIds.length > 0) {
                  await client.query(
                    'DELETE FROM public.quiz_questions WHERE id = ANY($1::uuid[])',
                    [existingQIds]
                  );
                }

                const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
                for (let qIdx = 0; qIdx < questions.length; qIdx += 1) {
                  const q = questions[qIdx];
                  const questionId = ensureUuid(q.id, `quiz-question:${m.id}`);
                  const options = Array.isArray(q.options) ? q.options : [];
                  const optionRows = options.map((opt: any, optIdx: number) => ({
                    id: ensureUuid(opt.id, `quiz-option:${questionId}`),
                    rawId: opt.id,
                    text: opt.text || '',
                    position: optIdx,
                  }));
                  const correctOption = optionRows.find(
                    (opt: any) => opt.rawId === q.correctOptionId || opt.id === q.correctOptionId
                  );

                  await client.query(`
                    INSERT INTO public.quiz_questions (
                      id, quiz_id, prompt, image_url, explanation, position, correct_option_id
                    ) VALUES ($1, $2, $3, $4, $5, $6, NULL);
                  `, [
                    questionId,
                    actualQuizId,
                    q.prompt || '',
                    q.imageUrl || null,
                    q.explanation || null,
                    qIdx,
                  ]);

                  for (const opt of optionRows) {
                    await client.query(`
                      INSERT INTO public.quiz_options (
                        id, question_id, option_text, position
                      ) VALUES ($1, $2, $3, $4);
                    `, [opt.id, questionId, opt.text, opt.position]);
                  }

                  if (correctOption?.id) {
                    await client.query(
                      'UPDATE public.quiz_questions SET correct_option_id = $1 WHERE id = $2',
                      [correctOption.id, questionId]
                    );
                  }
                }
              } else {
                await client.query('DELETE FROM public.quiz_definitions WHERE material_id = $1', [m.id]);
              }
            }
          }

          const rawAssignments = Array.isArray(u.assignments)
            ? u.assignments
            : u.assignment
            ? [u.assignment]
            : [];

          const normalizedAssignments = rawAssignments.map((a: any) => ({
            ...a,
            id: ensureUuid(a.id, `assignment:${u.id}`),
          }));

          const assignIds = normalizedAssignments.map((a: any) => a.id).filter(Boolean);
          if (assignIds.length > 0) {
            await client.query(
              'DELETE FROM public.assignments WHERE unit_id = $1 AND id != ALL($2::uuid[])',
              [unitId, assignIds]
            );
          } else {
            await client.query('DELETE FROM public.assignments WHERE unit_id = $1', [unitId]);
          }

          for (const a of normalizedAssignments) {
            await client.query(`
              INSERT INTO public.assignments (
                id, unit_id, period_id, title, description, deadline, max_score,
                allowed_file_type, submission_type, countdown_enabled, countdown_minutes, countdown_started_at
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
              )
              ON CONFLICT (id) DO UPDATE SET
                unit_id = EXCLUDED.unit_id,
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
              unitId,
              periodId,
              a.title || 'Tugas Praktik PDF',
              a.description || '',
              normalizeDeadline(a.deadline),
              Number(a.maxScore) || 100,
              a.allowedFileType || 'PDF',
              a.submissionType || 'ASSIGNMENT',
              Boolean(a.countdownEnabled),
              a.countdownEnabled ? Math.max(1, Number(a.countdownMinutes) || 1) : (Number(a.countdownMinutes) || 0),
              a.countdownEnabled ? (a.countdownStartedAt || new Date().toISOString()) : null,
            ]);
          }

          await client.query('COMMIT');
          invalidateDataCache();
          return res.status(200).json({ success: true, unitId });
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        }
      }

      case 'update_learning_unit_number': {
        const { id, unitNumber } = payload || {};
        if (!id) return res.status(400).json({ error: 'Learning unit id required' });
        const unitId = ensureUuid(id, 'learning-unit');
        await client.query(
          'UPDATE public.learning_units SET unit_number = $1 WHERE id = $2',
          [Number(unitNumber) || 1, unitId]
        );
        invalidateDataCache();
        return res.status(200).json({ success: true });
      }

      case 'delete_learning_unit': {
        const { id } = payload || {};
        if (!id) return res.status(400).json({ error: 'Learning unit id required' });
        await client.query('DELETE FROM public.learning_units WHERE id = $1', [ensureUuid(id, 'learning-unit')]);
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

        const kind =
          target === 'unit'
            ? 'learning-unit'
            : target === 'material'
            ? 'learning-material'
            : 'assignment';

        await client.query(`
          UPDATE ${table}
          SET countdown_enabled = $1, countdown_minutes = $2, countdown_started_at = $3
          WHERE id = $4
        `, [
          Boolean(countdownEnabled),
          countdownEnabled ? Math.max(1, Number(countdownMinutes) || 1) : (Number(countdownMinutes) || 0),
          countdownEnabled ? (countdownStartedAt || new Date().toISOString()) : null,
          ensureUuid(id, kind),
        ]);

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
          ensureUuid(s.id, 'submission'),
          ensureUuid(s.assignmentId, 'assignment'),
          ensureUuid(s.studentId, 'student'),
          ensureUuid(s.periodId, 'period'),
          s.fileName || 'Dokumen Tugas',
          s.fileUrl || '',
          s.fileSize || '0 KB',
          s.storagePath || null,
          s.submittedAt || new Date().toISOString(),
          s.status || 'SUBMITTED',
          s.submissionType || 'ASSIGNMENT',
          s.reviewFeedback || null,
          s.reviewedAt || null,
          Number(s.revisionNumber) || 1,
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
        `, [status, reviewFeedback || null, reviewedAt || new Date().toISOString(), Number(revisionNumber) || 1, ensureUuid(id, 'submission')]);

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
          ensureUuid(a.id, `assessment:${a.periodId}:${a.studentId}`),
          ensureUuid(a.periodId, 'period'),
          ensureUuid(a.studentId, 'student'),
          a.qualityScore || 0,
          a.entryBehaviorScore ?? 0,
          a.subCpmkPracticeScore ?? 0,
          a.assignmentScore ?? 0,
          a.postTestScore ?? 0,
          a.postTestFileUrl || null,
          a.attitudeScore || 0,
          a.creativityScore || 0,
          a.reportScore || 0,
          a.finalScore || 0,
          a.feedback || '',
          Boolean(a.isPublished),
          a.publishedAt || null,
          a.gradedAt || new Date().toISOString(),
          JSON.stringify(a.qualityScores || []),
          JSON.stringify(a.attitudeScores || []),
          JSON.stringify(a.creativityScores || []),
          JSON.stringify(a.reportScores || []),
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
              ensureUuid(a.id, `assessment:${a.periodId}:${a.studentId}`),
              ensureUuid(a.periodId, 'period'),
              ensureUuid(a.studentId, 'student'),
              a.qualityScore || 0,
              a.entryBehaviorScore ?? 0,
              a.subCpmkPracticeScore ?? 0,
              a.assignmentScore ?? 0,
              a.postTestScore ?? 0,
              a.postTestFileUrl || null,
              a.attitudeScore || 0,
              a.creativityScore || 0,
              a.reportScore || 0,
              a.finalScore || 0,
              a.feedback || '',
              Boolean(a.isPublished),
              a.publishedAt || null,
              a.gradedAt || new Date().toISOString(),
              JSON.stringify(a.qualityScores || []),
              JSON.stringify(a.attitudeScores || []),
              JSON.stringify(a.creativityScores || []),
              JSON.stringify(a.reportScores || []),
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

        const announcementId = ensureUuid(an.id, 'announcement');
        const courseId = ensureUuid(an.courseId, 'course');
        const periodId = an.periodId ? ensureUuid(an.periodId, 'period') : null;

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
          announcementId,
          courseId,
          periodId,
          an.title,
          an.message || '',
          an.priority || 'INFO',
          an.isActive !== false,
          an.publishedAt || an.createdAt || new Date().toISOString(),
          an.expiresAt || null,
        ]);

        invalidateDataCache();
        return res.status(200).json({ success: true, id: announcementId });
      }

      case 'delete_announcement': {
        const { id } = payload || {};
        if (!id) return res.status(400).json({ error: 'Announcement id required' });
        await client.query('DELETE FROM public.announcements WHERE id = $1', [ensureUuid(id, 'announcement')]);
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
            id, period_id, student_id, title, description, deadline,
            status, submission_file_name, submission_file_url,
            submitted_at, reviewed_at, submission_storage_path, created_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            deadline = EXCLUDED.deadline,
            status = EXCLUDED.status,
            submission_file_name = EXCLUDED.submission_file_name,
            submission_file_url = EXCLUDED.submission_file_url,
            submitted_at = EXCLUDED.submitted_at,
            reviewed_at = EXCLUDED.reviewed_at,
            submission_storage_path = EXCLUDED.submission_storage_path;
        `, [
          ensureUuid(r.id, 'remedial'),
          ensureUuid(r.periodId, 'period'),
          ensureUuid(r.studentId, 'student'),
          r.title || 'Tugas Tambahan Pengganti Kehadiran',
          r.description || r.remedialDescription || '',
          normalizeDeadline(r.deadline),
          r.status || 'PENDING_SUBMISSION',
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
        `, [status, reviewedAt || new Date().toISOString(), ensureUuid(id, 'remedial')]);

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
