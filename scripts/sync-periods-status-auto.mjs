// Script to synchronize all period statuses in Supabase using real-time internet date
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ftxinqzupcgncmvmeqjh.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function syncPeriods() {
  console.log('Fetching internet time from timeapi.io...');
  let todayStr = '';
  try {
    const res = await fetch('https://timeapi.io/api/time/current/zone?timeZone=Asia/Makassar');
    const data = await res.json();
    todayStr = `${data.year}-${String(data.month).padStart(2, '0')}-${String(data.day).padStart(2, '0')}`;
    console.log(`Internet time (WITA): ${data.dateTime} -> Date string: ${todayStr}`);
  } catch (e) {
    console.warn('Fallback to server/local time:', e.message);
    const now = new Date();
    todayStr = now.toISOString().slice(0, 10);
  }

  console.log(`Evaluating all periods against today: ${todayStr}`);

  const { data: periods, error } = await supabase
    .from('practice_periods')
    .select('id, course_id, name, period_number, start_date, end_date, status')
    .order('start_date', { ascending: true });

  if (error || !periods) {
    console.error('Error fetching periods:', error);
    return;
  }

  console.log(`Found ${periods.length} periods in database.`);

  const updates = [];
  for (const p of periods) {
    let expectedStatus = 'UPCOMING';
    if (todayStr < p.start_date) {
      expectedStatus = 'UPCOMING';
    } else if (todayStr > p.end_date) {
      expectedStatus = 'COMPLETED';
    } else {
      expectedStatus = 'ACTIVE';
    }

    if (p.status !== expectedStatus) {
      console.log(`Updating "${p.name}" (${p.start_date} to ${p.end_date}): ${p.status} -> ${expectedStatus}`);
      updates.push({
        id: p.id,
        course_id: p.course_id,
        name: p.name,
        period_number: p.period_number,
        start_date: p.start_date,
        end_date: p.end_date,
        status: expectedStatus,
        updated_at: new Date().toISOString()
      });
    } else {
      console.log(`"${p.name}" is already up-to-date: ${p.status}`);
    }
  }

  if (updates.length > 0) {
    console.log(`Upserting ${updates.length} changed periods to Supabase...`);
    const { error: upsertError } = await supabase.from('practice_periods').upsert(updates);
    if (upsertError) {
      console.error('Error upserting periods:', upsertError);
    } else {
      console.log('Successfully synchronized period statuses to Supabase!');
    }
  } else {
    console.log('All periods are already synchronized with internet date.');
  }
}

syncPeriods();
