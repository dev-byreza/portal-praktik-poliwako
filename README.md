# 🎓 Portal Praktik Poliwako

<p align="center">
  <img src="https://raw.githubusercontent.com/dev-byreza/portal-praktik-poliwako/main/src/assets/logo.png" alt="Portal Praktik Poliwako Logo" width="100" onerror="this.style.display='none'"/>
</p>

<p align="center">
  <strong>Practice Learning Management & Assessment System Berbasis Outcome-Based Education (OBE)</strong><br>
  <em>Politeknik Sorowako • Jurusan Teknik Mesin & Manufaktur</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Drizzle_ORM-0.38-C5F74F?logo=drizzle&logoColor=black" alt="Drizzle ORM" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
</p>

---

## 📖 Ringkasan Produk

**Portal Praktik Poliwako** adalah aplikasi web terpusat untuk memfasilitasi instruktur Politeknik Sorowako dalam mengelola seluruh siklus pembelajaran praktik vokasi. Sistem ini mengintegrasikan manajemen mata kuliah, periode gelombang praktik, modul pembelajaran modular, pengumpulan tugas berkas PDF, presensi 5 hari berbobot, penilaian OBE (*Outcome-Based Education*), penanganan remedial, hingga rekapitulasi nilai dan analitik performa mahasiswa.

- **Instruktur**: Masuk menggunakan akun email institusi resmi (`@politekniksorowako.ac.id`).
- **Mahasiswa**: Mengakses ruang belajar mandiri tanpa memerlukan akun rumit, cukup melalui URL publik mata kuliah (contoh: `/{course-slug}`) dan memilih identitas Nama + NIM yang telah didaftarkan instruktur pada periode berjalan.

---

## ✨ Fitur Unggulan

### 👨‍🏫 Sisi Instruktur (Command Center)

1. **Dashboard Overview & Analitik KPI**
   - KPI interaktif: Total Peserta, Progress Pembelajaran Rata-rata, Proyek Dikumpulkan, Status Penilaian, dan Peringatan Kehadiran <75%.
   - Ranking Top 3 mahasiswa terbaik per periode gelombang dan per mata kuliah.
   - Grafik perkembangan performa harian (*Daily Score Chart*).

2. **Course Setup Wizard & Course Switcher**
   - Panduan 6 langkah (*Wizard*) pembuatan mata kuliah baru: Identitas MK, URL Slug otomatis, Pemetaan Sub-CPMK, Kriteria Rubrik OBE, Review, dan Publikasi.
   - Fitur **Salin Mata Kuliah** (*Copy Course*) untuk mereplikasi kurikulum ke semester berikutnya tanpa menduplikasi data nilai atau peserta.
   - Penggantian mata kuliah instan melalui *Course Switcher* di bilah samping (*Sidebar*).

3. **Database Mahasiswa & Bulk NIM Lookup**
   - Pengelolaan master mahasiswa terpisah dari mata kuliah.
   - Fitur **Import CSV** dengan parser otomatis, deteksi duplikasi NIM, dan pratinjau data sebelum disimpan.
   - Pendaftaran peserta gelombang dengan pencarian 3 angka belakang NIM dan modal resolusi jika terdapat kesamaan nomor urut pada angkatan berbeda.

4. **Periode Praktik (Timezone Asia/Makassar WITA)**
   - Kalkulasi otomatis durasi standar 5 hari kerja (contoh: Senin 7 September s/d Jumat 11 September).
   - Penentuan status gelombang otomatis: *Akan Datang*, *Aktif*, dan *Selesai*.
   - Duplikasi konfigurasi materi/tugas dari periode sebelumnya dalam 1 klik.

5. **Learning Content Studio (LMS Modular)**
   - Modul bertahap dengan *Progressive Locking* (Unit berikutnya hanya terbuka setelah unit aktif ditandai selesai).
   - Mendukung materi: Teks Kaya (*Rich Text*), PDF Materi dengan Viewer terintegrasi, Video embed YouTube, dan Tautan Eksternal (Google Drive/Website).
   - Penugasan tugas praktik internal (khusus format PDF).

6. **Presensi 5 Hari & Otomasi Remedial**
   - Presensi default hadir (100%), nilai interval 20% per hari.
   - **Aturan Batas Kehadiran 75%**: Mahasiswa dengan kehadiran <75% (hadir ≤3 hari) otomatis ditandai *Wajib Tugas Tambahan*.
   - Penugasan dan peninjauan berkas tugas tambahan (Remedial).
   - Nilai mahasiswa yang terkena aturan kehadiran otomatis terpublikasi ketika semua tugas remedialnya berstatus **LULUS**.

7. **Grading Workspace Berbasis OBE**
   - Antarmuka *Split-Screen*: Pratinjau berkas PDF tugas di sisi kiri dan formulir penilaian rubrik di sisi kanan tanpa perlu berpindah tab atau mengunduh berkas.
   - Perhitungan otomatis formula nilai terbobot sesuai PRD:
     $$\text{Nilai Akhir} = (\text{Kualitas} \times 70\%) + (\text{Sikap} \times 10\%) + (\text{Kreativitas} \times 5\%) + (\text{Laporan} \times 15\%)$$
   - Komponen Kualitas mencakup: Kesiapan (10%), Praktik Sub-CPMK (50%), Tugas (15%), dan Post-Test (25%).
   - Skala Rubrik OBE: Sangat Baik (100), Baik (75), Cukup (50), Kurang (25), dan Tidak Mengerjakan (0).
   - Aturan umpan balik (*Feedback*) otomatis sesuai interval nilai akhir.

8. **Rekap Nilai & Export Data**
   - Export rekapitulasi data nilai lengkap ke format **Microsoft Excel (`.xlsx`)** dan **CSV**.

---

### 👨‍🎓 Sisi Mahasiswa (Public Student Portal)

1. **Akses Cepat Berbasis URL Slug**
   - URL ramah pengguna: `/pemesinan-cnc`, `/cad-cam`, dll.
2. **Autentikasi Aman Tanpa Akun**
   - Identifikasi berbasis NIM + Nama yang terdaftar pada gelombang aktif.
   - Registrasi password mandiri saat pertama kali login.
3. **Workspace Pembelajaran Bertahap (*Progressive Locking*)**
   - Silabus interaktif dengan status unit: *Locked* 🔒, *Available* ●, dan *Completed* ✓.
   - Pratinjau dokumen materi PDF langsung di browser dan pemutar video YouTube.
4. **Pengumpulan Tugas PDF & Final Project**
   - Unggah berkas tugas latihan khusus PDF.
   - Pengumpulan Final Project melalui tautan Google Drive bersama dengan konfirmasi centang.
5. **Transparansi Hasil & Feedback**
   - Mahasiswa dapat melihat Nilai Akhir dan Umpan Balik Instruktur setelah dipublikasikan.
   - Proteksi otomatis bagi mahasiswa yang belum menuntaskan tugas remedial.

---

## 🛠️ Tech Stack & Arsitektur

| Lapisan | Teknologi |
|---|---|
| **Frontend Framework** | [React 18](https://react.dev/) + [Vite 6](https://vitejs.dev/) |
| **Bahasa Pemrograman** | [TypeScript 5.6](https://www.typescriptlang.org/) |
| **Styling & Desain** | [Tailwind CSS 3.4](https://tailwindcss.com/) + Custom Glassmorphism Theme |
| **Ikonografi & Animasi** | [Lucide React](https://lucide.dev/) + [Canvas Confetti](https://www.npmjs.com/package/canvas-confetti) |
| **Spreadsheet Tool** | [SheetJS (XLSX)](https://sheetjs.com/) |
| **Backend & Database** | [PostgreSQL via Supabase](https://supabase.com/) |
| **Keamanan Data** | Supabase Row Level Security (RLS) |
| **Penyimpanan Berkas** | Supabase Storage (`submissions` & `materials` buckets) |
| **ORM & Migrasi** | [Drizzle ORM](https://orm.drizzle.team/) + Drizzle Kit |

---

## 📁 Struktur Direktori

```
portal-praktik-poliwako/
├── public/                     # Aset statis & logo
├── scripts/                    # Script otomatisasi backend
│   └── setup-real-account.mjs  # Inisialisasi akun & storage Supabase
├── src/
│   ├── backend/
│   │   └── db/
│   │       └── schema.ts       # Definisi 17 tabel Drizzle ORM
│   ├── components/
│   │   ├── common/             # ModalPortal, PDFViewerModal, Badge, Navbar
│   │   ├── instructor/         # Dashboard, Grading, Attendance, Studio, Wizard
│   │   └── student/            # StudentPortal, Catalog, Assignment, GradeCard
│   ├── context/
│   │   └── AppContext.tsx      # State management & reactive storage sync
│   ├── data/
│   │   └── mockData.ts         # Clean state & profil instruktur real
│   ├── services/
│   │   ├── apiService.ts       # Hybrid API layer (Supabase + LocalStorage)
│   │   ├── storageService.ts   # Persistent local caching layer
│   │   └── supabaseClient.ts   # Supabase client & Storage helpers
│   ├── types/
│   │   └── index.ts            # Type definitions TypeScript
│   ├── utils/                  # Kalkulator nilai, tanggal WITA, export XLSX
│   ├── App.tsx                 # Routing utama & switcher peran
│   └── main.tsx                # Entry point aplikasi
├── supabase/
│   ├── migrations/
│   │   └── 0000_initial_schema.sql  # Skema SQL, RLS, Triggers & Storage
│   ├── seed_real_account.sql        # Seed akun real & storage setup
│   └── README.md                    # Dokumentasi lengkap setup backend
├── drizzle.config.ts           # Konfigurasi Drizzle ORM
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## 🚀 Panduan Memulai Cepat

### 1. Prasyarat
- [Node.js](https://nodejs.org/) versi 18 atau lebih tinggi
- [npm](https://www.npmjs.com/) atau pnpm

### 2. Instalasi Dependensi
```bash
git clone https://github.com/dev-byreza/portal-praktik-poliwako.git
cd portal-praktik-poliwako
npm install
```

### 3. Konfigurasi Environment (Opsional untuk Supabase Live)
Salin `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Isi variabel Supabase (dapat diambil dari Dashboard Supabase Anda):
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here
```
> *Catatan: Jika `.env` tidak diisi, aplikasi tetap berjalan normal 100% dalam mode **Local Offline / Reactive Storage**.*

### 4. Menjalankan Server Pengembangan
```bash
npm run dev
```
Buka browser pada alamat [http://localhost:5173](http://localhost:5173).

### 5. Build Produksi
```bash
npm run build
```

---

---

## 🗄️ Menyiapkan Supabase & Storage PDF

1. Buka [Supabase Dashboard](https://supabase.com) -> pilih proyek Anda -> buka **SQL Editor**.
2. Jalankan skrip migrasi utama:
   [`supabase/migrations/0000_initial_schema.sql`](./supabase/migrations/0000_initial_schema.sql)
3. Jalankan skrip akun real dan storage bucket:
   [`supabase/seed_real_account.sql`](./supabase/seed_real_account.sql)
4. Storage bucket `submissions` (Private, PDF-only) dan `materials` (Public-read) akan langsung aktif dan siap digunakan.

---

## 🌐 Panduan Deployment (Vercel)

1. Hubungkan repositori GitHub ini ke akun **Vercel** Anda.
2. Tambahkan Environment Variables pada menu *Settings -> Environment Variables*:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Jalankan deploy dengan konfigurasi bawaan Vite:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

---

## 👨‍💻 Kontributor & Lisensi

Dibuat untuk **Politeknik Sorowako**.
- Pengembang: **[dev-byreza](https://github.com/dev-byreza)**
- Lisensi: **MIT License** — Bebas digunakan dan dikembangkan untuk keperluan akademik.
