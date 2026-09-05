# Panduan Setup Backend Supabase — Portal Praktik Poliwako

Panduan ini mengacu pada **Product Requirements Document (PRD) v1.0 MVP**.

## 1. Persiapan Supabase Project
1. Buat proyek baru di [Supabase Dashboard](https://supabase.com).
2. Salin **Project URL** dan **anon public key** dari menu *Project Settings* -> *API*.
3. Salin file `.env.example` menjadi `.env` di root project:
   ```bash
   cp .env.example .env
   ```
4. Masukkan URL dan Key:
   ```env
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJh...
   ```

## 2. Eksekusi Migrasi Database & Security (RLS)
1. Masuk ke menu **SQL Editor** pada Dashboard Supabase Anda.
2. Buka file [`supabase/migrations/0000_initial_schema.sql`](./migrations/0000_initial_schema.sql).
3. Salin seluruh konten SQL dan jalankan (*Run*).
4. Skrip ini secara otomatis akan:
   - Membuat 17 tabel inti relasional (Profiles, Students, Courses, Sub-CPMK, Rubrics, Periods, LMS, Submissions, Attendance, Assessments, Remedials, Feedback Rules, Audit Logs).
   - Mengaktifkan **Row Level Security (RLS)** pada seluruh tabel untuk isolasi antar-instruktur.
   - Mengonfigurasi Storage Bucket `submissions` (Private, PDF-only) dan `materials` (Public read).
   - Mengatur fungsi validasi domain Google OAuth `@politekniksorowako.ac.id`.

## 3. Autentikasi Instruktur (Tanpa Google OAuth)
Autentikasi instruktur menggunakan email institusi `@politekniksorowako.ac.id` secara langsung tanpa memerlukan konfigurasi Google OAuth ataupun Google Cloud Console.
- Tidak perlu membuat Client ID / Client Secret Google OAuth di Supabase.
- Cukup gunakan autentikasi email institusi langsung atau Supabase Email Auth bawaan.
- Sistem secara otomatis memverifikasi bahwa akun yang masuk memiliki domain `@politekniksorowako.ac.id` dan menolak email personal/luar.

## 4. Menjalankan Drizzle Studio (Database GUI)
Untuk melihat dan mengelola data secara langsung melalui antarmuka web Drizzle Studio:
```bash
npx drizzle-kit studio
```
Buka browser pada `https://local.drizzle.studio`.
