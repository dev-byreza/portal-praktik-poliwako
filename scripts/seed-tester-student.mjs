import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';

if (existsSync('.env')) {
  const envContent = readFileSync('.env', 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [k, ...v] = trimmed.split('=');
      process.env[k.trim()] = v.join('=').trim();
    }
  }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Supabase URL / Key missing in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log('Querying instructor profile from Supabase...');
  const { data: profiles, error: profileErr } = await supabase.from('profiles').select('id, name, email').limit(5);
  if (profileErr) {
    console.error('Error fetching profiles:', profileErr);
  } else {
    console.log('Found profiles:', profiles);
  }

  const instructorId = profiles && profiles.length > 0 ? profiles[0].id : null;

  if (!instructorId) {
    console.error('No instructor profile found in database.');
    return;
  }

  console.log(`Using instructorId: ${instructorId}`);

  // Check if student with NIM 001 exists
  const { data: existingStudent, error: fetchErr } = await supabase
    .from('students')
    .select('*')
    .eq('nim', '001')
    .maybeSingle();

  if (fetchErr) {
    console.error('Error checking existing student:', fetchErr);
  }

  if (existingStudent) {
    console.log('Student 001 exists, updating password and name...', existingStudent);
    const { data: updated, error: updateErr } = await supabase
      .from('students')
      .update({
        name: 'Tester',
        password_hash: '123',
        class_name: '1C',
        updated_at: new Date().toISOString()
      })
      .eq('id', existingStudent.id)
      .select();
    if (updateErr) {
      console.error('Update failed:', updateErr);
    } else {
      console.log('Student 001 updated successfully:', updated);
    }
  } else {
    console.log('Student 001 does not exist, inserting...');
    const { data: inserted, error: insertErr } = await supabase
      .from('students')
      .insert({
        instructor_id: instructorId,
        nim: '001',
        name: 'Tester',
        class_name: '1C',
        email: 'tester@politekniksorowako.ac.id',
        password_hash: '123'
      })
      .select();
    if (insertErr) {
      console.error('Insert failed:', insertErr);
    } else {
      console.log('Student 001 inserted successfully:', inserted);
    }
  }

  // Also query CAD 1.1 active period to auto-enroll Tester if periods exist
  const { data: periods } = await supabase.from('practice_periods').select('*').limit(1);
  if (periods && periods.length > 0) {
    const student = existingStudent || (await supabase.from('students').select('*').eq('nim', '001').single()).data;
    if (student) {
      const { data: part } = await supabase.from('practice_participants').select('*').eq('period_id', periods[0].id).eq('student_id', student.id).maybeSingle();
      if (!part) {
        await supabase.from('practice_participants').insert({
          period_id: periods[0].id,
          student_id: student.id,
          enrolled_at: new Date().toISOString().split('T')[0],
          progress_status: 'IN_PROGRESS',
          final_project_confirmed: false
        });
        console.log('Enrolled tester into period:', periods[0].name);
      }
    }
  }

  console.log('Done!');
}

main().catch(console.error);
