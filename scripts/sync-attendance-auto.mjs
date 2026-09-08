// Script to automatically ensure all participants across practice periods have initial 100% attendance in Supabase
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ftxinqzupcgncmvmeqjh.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function autoSyncAttendance() {
  console.log('Fetching practice participants from Supabase...');
  const { data: participants, error: partError } = await supabase
    .from('practice_participants')
    .select('id, period_id, student_id');

  if (partError || !participants) {
    console.error('Error fetching participants:', partError);
    return;
  }

  console.log(`Total participants found: ${participants.length}`);

  const { data: existingAttendance, error: attError } = await supabase
    .from('attendance_records')
    .select('period_id, student_id');

  const existingSet = new Set(
    (existingAttendance || []).map(a => `${a.period_id}_${a.student_id}`)
  );

  const toInsert = [];
  for (const p of participants) {
    const key = `${p.period_id}_${p.student_id}`;
    if (!existingSet.has(key)) {
      toInsert.push({
        period_id: p.period_id,
        student_id: p.student_id,
        day1: 'HADIR',
        day2: 'HADIR',
        day3: 'HADIR',
        day4: 'HADIR',
        day5: 'HADIR',
        percentage: 100.00,
        is_eligible: true,
        updated_at: new Date().toISOString()
      });
    }
  }

  console.log(`Need to auto-create 100% Hadir attendance records for: ${toInsert.length} participant(s).`);

  if (toInsert.length > 0) {
    const chunkSize = 50;
    for (let i = 0; i < toInsert.length; i += chunkSize) {
      const chunk = toInsert.slice(i, i + chunkSize);
      const { error: insErr } = await supabase.from('attendance_records').upsert(chunk, { onConflict: 'period_id,student_id' });
      if (insErr) {
        console.error('Error inserting attendance chunk:', insErr);
      } else {
        console.log(`Successfully synced chunk ${Math.floor(i / chunkSize) + 1} (${chunk.length} records)`);
      }
    }
  } else {
    console.log('All participants already have attendance records in database.');
  }
}

autoSyncAttendance();
