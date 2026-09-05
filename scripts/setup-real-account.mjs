// Script to set up real instructor account and storage in Supabase programmatically
// Usage: node scripts/setup-real-account.mjs

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

console.log('--- Setup Akun Real Instruktur Supabase ---');

if (!supabaseUrl || !serviceKey) {
  console.log('Peringatan: VITE_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diisi di .env');
  console.log('Untuk setup otomatis via SQL Editor Supabase, silakan jalankan:');
  console.log('  supabase/seed_real_account.sql');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const email = 'rezaf@politekniksorowako.ac.id';
  const password = '732401#Jhe';

  console.log(`Menyiapkan akun: ${email}`);

  // 1. Create or update user via Admin Auth API (if service key provided)
  try {
    const { data: user, error: userError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: 'M. Reza Firmansyah',
        department: 'Teknik Mesin',
      },
    });

    if (userError) {
      if (userError.message.includes('already registered')) {
        console.log('Akun sudah terdaftar. Mengupdate password...');
        // User exists, find and update
        const { data: usersList } = await supabase.auth.admin.listUsers();
        const existing = usersList?.users?.find((u) => u.email === email);
        if (existing) {
          await supabase.auth.admin.updateUserById(existing.id, { password });
          console.log('Password berhasil diupdate!');
        }
      } else {
        console.warn('Admin user creation notice:', userError.message);
      }
    } else {
      console.log('Akun Supabase Auth berhasil dibuat:', user?.user?.id);
    }
  } catch (err) {
    console.log('Info: Gunakan SQL script supabase/seed_real_account.sql untuk eksekusi langsung.');
  }

  // 2. Create Storage Buckets
  console.log('Memeriksa bucket storage (submissions & materials)...');
  try {
    await supabase.storage.createBucket('submissions', {
      public: false,
      fileSizeLimit: 26214400,
      allowedMimeTypes: ['application/pdf'],
    });
    console.log('Bucket "submissions" (Private, PDF only) siap.');
  } catch (e) {
    console.log('Bucket "submissions" sudah ada.');
  }

  try {
    await supabase.storage.createBucket('materials', {
      public: true,
      fileSizeLimit: 52428800,
    });
    console.log('Bucket "materials" (Public read) siap.');
  } catch (e) {
    console.log('Bucket "materials" sudah ada.');
  }

  console.log('Selesai!');
}

main().catch(console.error);
