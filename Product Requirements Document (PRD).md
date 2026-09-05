Product Requirements Document (PRD)
Portal Praktik Poliwako
Versi: 1.0 — MVP
Tanggal: 5 September 2026
Produk: Portal Praktik Poliwako
Institusi: Politeknik Sorowako
Platform: Web Application
Target utama: Instruktur Praktik & Mahasiswa
Metode pembelajaran: OBE / Outcome-Based Education
Status: Siap menjadi acuan UI/UX dan development



1. Ringkasan Produk
Portal Praktik Poliwako adalah aplikasi web terpusat untuk membantu instruktur Politeknik Sorowako mengelola seluruh proses pembelajaran praktik, mulai dari pengelolaan mata kuliah dan peserta, periode praktik, materi pembelajaran bertahap, pengumpulan tugas, monitoring progres, kehadiran, penilaian berbasis OBE, feedback, hingga analitik performa mahasiswa.
Instruktur masuk menggunakan akun Google institusi:
politekniksorowako.ac.id
Mahasiswa tidak membutuhkan akun.
Mahasiswa mengakses URL publik mata kuliah, misalnya:
praktik.politekniksorowako.ac.id/pemesinan-cnc
Mahasiswa kemudian memilih identitas Nama + NIM yang telah didaftarkan instruktur pada periode praktik aktif.
2. Latar Belakang
Proses pembelajaran praktik saat ini memiliki beberapa pain point:
- materi dan link praktik tersebar;
- mahasiswa kesulitan mengetahui materi/tugas yang benar;
- penilaian masih banyak dilakukan secara manual;
- pencapaian pembelajaran berbasis OBE sulit dilacak;
- rekap nilai membutuhkan waktu;
- monitoring progres mahasiswa tidak terpusat;
- instruktur perlu mengelola lebih dari satu mata kuliah;
- setiap mata kuliah memiliki beberapa periode praktik;
- pengelolaan mahasiswa dan kelompok praktik berulang;
- materi, tugas, project, kehadiran, dan penilaian belum berada dalam satu workflow.
Portal Praktik Poliwako dirancang sebagai single source of truth untuk aktivitas tersebut.
3. Product Vision
Membangun satu portal praktik terpusat yang memungkinkan instruktur mengelola pembelajaran, progres, tugas, kehadiran, OBE, dan penilaian mahasiswa secara sederhana, cepat, serta terukur.

Portal tidak ditujukan menjadi LMS kampus penuh pada MVP.
Fokusnya adalah workflow pembelajaran praktik.
4. Product Goals
Portal harus mampu:
1. Memusatkan materi dan aktivitas praktik.
2. Mempermudah instruktur mengelola beberapa mata kuliah.
3. Mengelola beberapa periode praktik dalam satu mata kuliah.
4. Menyediakan learning workspace bertahap bagi mahasiswa.
5. Menampilkan progres pembelajaran mahasiswa.
6. Mengelola tugas PDF dan project akhir.
7. Mempermudah penilaian tanpa mengunduh PDF.
8. Mendukung penilaian berbasis Sub-CPMK/OBE.
9. Mengotomatisasi perhitungan nilai.
10. Mengelola kehadiran praktik.
11. Menangani mahasiswa dengan kehadiran <75%.
12. Menyediakan dashboard KPI dan ranking.
13. Menghasilkan rekap nilai.
14. Mengurangi pekerjaan administratif instruktur.
15. Memberikan pengalaman mahasiswa yang sangat sederhana tanpa akun.
5. Non-Goals MVP
Versi awal tidak mencakup:
- akun mahasiswa;
- role administrator;
- integrasi SIAKAD;
- integrasi Google Drive API;
- pengecekan otomatis file project Google Drive;
- aplikasi Android/iOS native;
- ujian online;
- chat real-time;
- forum diskusi;
- video conference;
- plagiarism checker;
- AI grading.
Fitur tersebut dapat dipertimbangkan pada fase selanjutnya.
6. User Roles
6.1 Instruktur
Instruktur merupakan pengguna utama sistem.
Login menggunakan Google:
nama@politekniksorowako.ac.id
Instruktur dapat:
- membuat mata kuliah;
- copy mata kuliah;
- mengelola mahasiswa;
- membuat periode praktik;
- menambahkan peserta;
- bulk insert NIM;
- mengatur Sub-CPMK;
- membuat unit pembelajaran;
- mengunggah materi;
- menambahkan video YouTube;
- menambahkan link eksternal;
- membuat tugas;
- menentukan project akhir;
- mengatur rubrik;
- menilai mahasiswa;
- melihat PDF langsung;
- mengelola kehadiran;
- membuat tugas tambahan;
- mempublikasikan nilai;
- melihat analytics;
- export nilai.
7. Mahasiswa
Mahasiswa tidak memiliki akun.
Mahasiswa:
1. membuka URL mata kuliah;
2. memilih Nama + NIM;
3. masuk ke praktik aktif;
4. mengikuti learning unit;
5. menandai unit selesai;
6. mengerjakan latihan/tugas;
7. upload PDF;
8. menyelesaikan seluruh unit;
9. membuka Final Project;
10. upload project melalui Google Drive;
11. mengonfirmasi project telah dikumpulkan;
12. melihat nilai setelah dipublikasikan.
8. Authentication
8.1 Instruktur
Authentication:
Google OAuth melalui Supabase Auth
Hanya domain berikut yang diizinkan:
@politekniksorowako.ac.id
Akun seperti:
user@gmail.com
harus ditolak sebagai akun instruktur.
8.2 Mahasiswa
Tidak menggunakan authentication.
Identifikasi berdasarkan:
Nama + NIM
yang telah dimasukkan instruktur ke periode praktik.
Mahasiswa tidak dapat memilih mahasiswa dari seluruh Master Mahasiswa.
Hanya peserta periode yang relevan yang tersedia.
9. Multi-Instructor Architecture
Aplikasi mendukung banyak instruktur.
Namun:
Data setiap instruktur harus terisolasi.

Instruktur A tidak boleh melihat:
- mahasiswa instruktur B;
- mata kuliah instruktur B;
- nilai instruktur B;
- submission instruktur B;
- analytics instruktur B.
Implementasi wajib menggunakan:
Supabase Row Level Security (RLS).
10. Information Architecture
PORTAL PRAKTIK POLIWAKO
│
├── PUBLIC / MAHASISWA
│
│   └── /{course-slug}
│       ├── Identifikasi Mahasiswa
│       ├── Praktik Aktif
│       ├── Learning Workspace
│       ├── Tugas
│       ├── Progress
│       ├── Final Project
│       └── Nilai + Feedback
│
└── INSTRUKTUR
    │
    ├── Login
    ├── Dashboard
    ├── Master Mahasiswa
    ├── Mata Kuliah
    │   ├── Overview
    │   ├── Periode Praktik
    │   ├── Peserta
    │   ├── Learning Content
    │   ├── Tugas
    │   ├── Kehadiran
    │   ├── Penilaian
    │   ├── Analytics
    │   └── Settings
    │
    ├── Rekap
    └── Profil
11. Dashboard Instruktur
Setelah login:
Portal Praktik Poliwako

Dashboard
Master Mahasiswa
Mata Kuliah
Rekap & Analytics
Pengaturan

----------------------

MATA KULIAH SAYA

Pemesinan CNC
CAD/CAM
...

+ Tambah Mata Kuliah
Dashboard berfungsi sebagai command center.
12. Course Switcher
Instruktur harus dapat berpindah mata kuliah dengan cepat.
Contoh:
[ Pemesinan CNC ▾ ]

CAD/CAM
Pemesinan CNC
...
Seluruh KPI setelah mata kuliah dipilih hanya menampilkan data mata kuliah tersebut.
13. Dashboard KPI
Dashboard mata kuliah menampilkan minimal:
Total Peserta
Progress Pembelajaran
Project Dikumpulkan
Belum Selesai
Sudah Dinilai
Belum Dinilai
Kehadiran <75%
14. Grafik Performa
Dashboard menampilkan perkembangan nilai harian.
Filter:
- periode praktik;
- kelas;
- tanggal;
- seluruh peserta.
Tujuannya agar instruktur dapat melihat perubahan performa mahasiswa selama aktivitas praktik.
15. Ranking
Terdapat dua ranking.
Top 3 Periode Praktik
Menampilkan tiga nilai terbaik pada periode praktik yang dipilih.
Top 3 Umum Mata Kuliah
Menampilkan tiga performa terbaik dari mahasiswa dalam konteks mata kuliah aktif.
Ranking tidak mencampurkan data mata kuliah lain.
16. Master Mahasiswa
Database mahasiswa dibuat terpisah dari mata kuliah.
Struktur minimal:
Field	Required
NIM	Ya
Nama	Ya
Kelas	Ya


NIM harus unik dalam Master Mahasiswa milik instruktur.
17. Import CSV Mahasiswa
Format:
NIM,Nama,Kelas
240001,Andi Saputra,2A
240002,Siti Rahma,2A
240003,Budi Santoso,2B
Import harus memiliki:
- upload CSV;
- parsing;
- preview;
- validasi;
- deteksi NIM duplikat;
- informasi baris error;
- konfirmasi sebelum import.
18. Mata Kuliah
Struktur mata kuliah:
Nama Mata Kuliah
Tahun Ajaran
Semester
Slug
Status
Contoh:
Nama:
Pemesinan CNC

Tahun Ajaran:
2026/2027

Semester:
Ganjil

Slug:
pemesinan-cnc
URL mahasiswa:
/praktik/pemesinan-cnc
atau pada production:
praktik.politekniksorowako.ac.id/pemesinan-cnc
19. Course Setup Wizard
Pembuatan mata kuliah menggunakan wizard.
Step 1 — Informasi Mata Kuliah
- Nama Mata Kuliah
- Tahun Ajaran
- Semester
Step 2 — URL
Sistem menghasilkan slug otomatis.
Step 3 — Sub-CPMK
Instruktur memasukkan Sub-CPMK.
Step 4 — Rubrik
Konfigurasi rubrik.
Step 5 — Review
Instruktur memeriksa konfigurasi.
Step 6 — Publish
Mata kuliah siap digunakan.
Peserta dan periode praktik tidak wajib dibuat saat wizard.
20. Copy Mata Kuliah
Instruktur dapat:
Copy Mata Kuliah

Digunakan terutama untuk semester berikutnya.
Yang dapat disalin:
- nama/struktur course;
- Sub-CPMK;
- rubrik;
- learning units;
- materi;
- link;
- tugas;
- konfigurasi nilai;
- feedback rules.
Yang tidak disalin:
- peserta;
- nilai;
- submission;
- progress;
- kehadiran;
- remedial;
- tanggal periode.
21. Periode Praktik
Satu mata kuliah dapat memiliki banyak periode.
Contoh:
Pemesinan CNC
Ganjil 2026/2027

Periode 1
Periode 2
Periode 3
Periode 4
Periode 5
Periode 6
Periode 7
Periode 8
Tidak ada batas keras 8 periode.
Instruktur dapat menambahkan periode sesuai kebutuhan.
22. Pembuatan Periode
Instruktur cukup menentukan:
Tanggal Mulai
Contoh:
7 September 2026
Default durasi:
5 hari
Sistem menghasilkan:
Minggu Praktik ke-3 (7–11 September 2026)

Tanggal selesai dapat diubah instruktur.
23. Timezone
Seluruh business logic tanggal menggunakan:
Asia/Makassar
UTC+8
WITA
Waktu browser pengguna tidak boleh menjadi satu-satunya sumber kebenaran status periode.
24. Status Periode
Status dihitung otomatis.
now < start_date
→ UPCOMING

start_date <= now <= end_date
→ ACTIVE

now > end_date
→ COMPLETED
UI:
- Akan Datang
- Aktif
- Selesai
25. Duplicate Periode
Instruktur dapat menggunakan:
Duplicate Periode

untuk menyalin konfigurasi periode sebelumnya.
Dapat menyalin:
- struktur learning unit;
- materi;
- tugas;
- Sub-CPMK terkait;
- rubrik;
- konfigurasi project.
Peserta, submission, progress, kehadiran, dan nilai tidak ikut disalin.
26. Peserta Praktik
Setelah periode dibuat, instruktur menambahkan mahasiswa dari Master Mahasiswa.
Dua metode:
- Add Individual
- Bulk Insert NIM
27. Bulk Insert NIM
Instruktur dapat paste:
240001
240002
240003
240004
Sistem melakukan lookup.
Preview:
✓ 240001 — Andi Saputra — 2A
✓ 240002 — Siti Rahma — 2A
✓ 240003 — Budi Santoso — 2B

⚠ 249999 — NIM tidak ditemukan
Sistem juga mendeteksi:
- NIM tidak ditemukan;
- NIM duplikat;
- mahasiswa sudah terdaftar;
- format tidak valid.
28. Public Course Portal
Mahasiswa membuka URL mata kuliah.
Contoh:
Portal Praktik Poliwako

Pemesinan CNC

Praktik Aktif
7–11 September 2026

Pilih Identitas

[Cari Nama / NIM]

Andi Saputra
240001 • 2A

[Masuk Praktik]
Hanya mahasiswa yang menjadi peserta periode relevan yang muncul.
29. Learning Workspace
Learning Workspace mengikuti pola LMS bertahap.
Struktur:
Course Outline

✓ Unit 1 — Pengenalan
✓ Unit 2 — Persiapan
● Unit 3 — Proses Kerja
🔒 Unit 4 — Evaluasi
🔒 Unit 5 — Penyelesaian
Instruktur bebas menentukan jumlah unit.
30. Learning Unit
Setiap unit dapat berisi kombinasi:
- rich text;
- instruksi;
- PDF;
- YouTube;
- link eksternal;
- latihan;
- tugas;
- informasi pendukung.
PDF materi dapat:
- preview;
- download.
31. Video
Video menggunakan link YouTube.
Jika memungkinkan, tampil sebagai embedded player.
Sistem tidak perlu melakukan video hosting.
32. External Material
Instruktur dapat menambahkan URL seperti:
- Google Drive;
- website;
- referensi eksternal.
URL dibuka melalui tombol:
Buka Materi

33. Learning Navigation
Mahasiswa berpindah menggunakan:
[Previous]

[Tandai Selesai & Next]
Syarat membuka unit berikutnya hanyalah:
mahasiswa menekan Tandai Selesai.

Tidak diperlukan quiz verification pada MVP.
34. Unit State
Tiga state utama:
LOCKED
AVAILABLE
COMPLETED
Unit pertama otomatis AVAILABLE.
Unit berikutnya LOCKED.
35. Progressive Locking
Jika:
Unit 1 = Completed
maka:
Unit 2 = Available
Jika mahasiswa membatalkan status Unit 1:
Unit 1 = Available
Unit 2+ = Locked
Progress setelah unit tersebut harus dihitung ulang.
36. Progress Tracking
Formula:
completed learning units
------------------------ × 100
total learning units
Contoh:
8 / 10 Unit

80%
Instruktur dapat melihat progress setiap mahasiswa.
37. Progress Status
Gunakan status:
NOT_STARTED
IN_PROGRESS
LEARNING_COMPLETE
PROJECT_SUBMITTED
ASSESSED
PUBLISHED
UI Indonesia:
- Belum Mulai
- Sedang Berjalan
- Pembelajaran Selesai
- Project Dikumpulkan
- Sudah Dinilai
- Nilai Dipublikasikan
38. Learning Completion
Setelah seluruh learning unit:
Learning Progress = 100%
Sistem membuka:
Final Project Unit

Unit final tidak dihitung sebagai learning progress sehingga mahasiswa tetap dapat melihat Pembelajaran 100%.
39. Final Project
Final Project menggunakan satu link Google Drive untuk seluruh peserta pada periode tersebut.
UI:
FINAL PROJECT

Seluruh unit pembelajaran telah selesai.

Silakan upload seluruh folder pekerjaan
ke Google Drive.

[Buka Google Drive]

□ Saya telah mengumpulkan project

[Konfirmasi Pengumpulan]
40. Project Confirmation
Sistem menyimpan:
- student_id;
- period_id;
- status;
- confirmation timestamp.
Tidak perlu melakukan pengecekan Google Drive.
Mahasiswa bertanggung jawab memastikan file benar-benar sudah diunggah.
41. Assignment
Instruktur dapat membuat beberapa tugas.
Contoh:
Tugas 1
Tugas 2
Laporan Kerja
Setiap tugas:
- judul;
- deskripsi;
- ketentuan;
- deadline;
- tipe file;
- status.
42. File Submission
Untuk submission internal portal:
PDF ONLY

Server harus melakukan validasi file.
Jangan hanya memeriksa ekstensi .pdf pada frontend.
43. Storage
File PDF disimpan menggunakan:
Supabase Storage
Database hanya menyimpan:
- storage path;
- filename;
- MIME;
- size;
- uploaded_at;
- submission relationship.
Jangan menyimpan binary PDF di PostgreSQL.
44. Akses Setelah Periode Selesai
Setelah periode 5 hari selesai:
Tetap dapat diakses:
- materi;
- PDF pembelajaran;
- video;
- unit pembelajaran.
Ditutup:
- submission reguler;
- submission project;
- aktivitas dengan deadline.
Instruktur dapat memperpanjang periode.
45. OBE
Penilaian Kualitas harus berhubungan dengan:
Sub-CPMK

Setiap praktik dapat menggunakan Sub-CPMK yang berbeda.
Dengan demikian kualitas pekerjaan tidak menggunakan rubrik general.
46. Rubrik Kualitas
Instruktur menentukan kriteria berdasarkan Sub-CPMK.
Contoh:
Sub-CPMK:
Mahasiswa mampu melakukan proses X...

Kriteria:

Ketepatan proses
Kualitas hasil
Ketepatan ukuran
Prosedur kerja
Setiap kriteria menggunakan level pencapaian.
47. Rubric Scale
Level	Score
Sangat Baik	100
Baik	75
Cukup	50
Kurang	25
Tidak Mengerjakan	0


Skala digunakan secara konsisten.
48. Soft Skill Rubric
Soft skill bersifat general.
Sikap
Contoh kriteria:
- disiplin;
- tanggung jawab;
- komunikasi;
- kerja sama;
- kepatuhan terhadap prosedur.
Kreativitas
Contoh:
- inisiatif;
- pemecahan masalah;
- pengembangan solusi;
- kreativitas pekerjaan.
Instruktur nantinya dapat mengubah kriteria.
49. Laporan Kerja
Laporan memiliki general rubric.
Contoh:
- kelengkapan;
- struktur;
- ketepatan data;
- pembahasan;
- kesimpulan.
Menggunakan skala yang sama:
100 / 75 / 50 / 25 / 0
50. Formula Nilai
Bobot standar:
Component	Weight
Kualitas	70%
Sikap	10%
Kreativitas	5%
Laporan Kerja	15%
Total	100%


Formula:
Final Score =
(Quality × 0.70)
+
(Attitude × 0.10)
+
(Creativity × 0.05)
+
(Report × 0.15)
Contoh:
Kualitas      = 85
Sikap         = 100
Kreativitas   = 75
Laporan       = 90

Final =
85 × .70
+ 100 × .10
+ 75 × .05
+ 90 × .15

= 86.75
51. Grading Workspace
Penilaian harus dapat dilakukan tanpa berpindah halaman.
Desktop layout:
┌───────────────────────┬──────────────────────┐
│                       │ MAHASISWA            │
│                       │ Andi Saputra         │
│                       │ 240001 • 2A          │
│                       │                      │
│                       │ KUALITAS             │
│     PDF PREVIEW       │ Kriteria 1 [Baik]   │
│                       │ Kriteria 2 [SB]      │
│                       │                      │
│                       │ SIKAP                │
│                       │ Disiplin [SB]        │
│                       │                      │
│                       │ KREATIVITAS          │
│                       │ Inisiatif [Baik]     │
│                       │                      │
│                       │ LAPORAN              │
│                       │ Struktur [SB]        │
│                       │                      │
│                       │ NILAI: 86.75         │
│                       │                      │
│                       │ [Simpan & Berikutnya]│
└───────────────────────┴──────────────────────┘
52. Autosave Penilaian
Disarankan menggunakan autosave.
Ketika instruktur memilih level rubrik:
Baik
perubahan tersimpan tanpa harus reload.
Tetap tampilkan indikator:
✓ Tersimpan
53. Kehadiran
Satu periode normal:
5 hari
Setiap hari:
20%
Sehingga:
5 hari = 100%
4 hari = 80%
3 hari = 60%
2 hari = 40%
1 hari = 20%
0 hari = 0%
54. Default Attendance
Semua peserta secara default:
Hadir

Instruktur hanya perlu mengubah mahasiswa yang:
Tidak Hadir

Ini mengurangi input manual.
55. Minimum Attendance
Minimum:
75%

Karena interval 20%, secara operasional mahasiswa harus hadir minimal:
4 dari 5 hari = 80%

56. Attendance Restriction
Jika:
attendance < 75%
maka:
grade_publishable = false
Nilai tetap:
- dihitung;
- disimpan;
- dapat dilihat instruktur.
Tetapi belum terlihat mahasiswa.
Status:
Wajib Tugas Tambahan

57. Tugas Tambahan
Instruktur dapat membuat satu atau lebih tugas tambahan.
Field:
- judul;
- deskripsi;
- ketentuan;
- deadline;
- PDF submission.
Instruktur memberikan status:
LULUS
BELUM LULUS
58. Remedial Completion
Jika mahasiswa memiliki tiga tugas tambahan:
Tugas A = Lulus
Tugas B = Lulus
Tugas C = Belum Lulus
nilai belum dipublikasikan.
Jika seluruhnya:
LULUS
maka:
Nilai otomatis dipublikasikan.

59. Grade Publication
Mahasiswa tidak langsung melihat nilai setelah dinilai.
Instruktur memiliki kontrol:
Publikasikan Nilai

Sebelum publish:
ASSESSED
Sesudah:
PUBLISHED
Kecuali mahasiswa terkena aturan kehadiran.
60. Student Grade View
Mahasiswa hanya melihat:
- Nilai Akhir;
- Feedback.
Tidak melihat:
- skor kualitas;
- skor sikap;
- kreativitas;
- laporan;
- detail rubrik.
Contoh:
HASIL PRAKTIK

Nilai Akhir

87 / 100

Sangat baik!
Pertahankan kualitas kerja dan
konsistensi Anda.
61. Automatic Feedback
Default:
Nilai	Feedback
86–100	Sangat baik! Pertahankan kualitas kerja dan konsistensi Anda.
76–85	Baik! Pertahankan hasilnya dan tingkatkan ketelitian.
61–75	Cukup baik. Tingkatkan pemahaman dan kualitas pekerjaan pada praktik berikutnya.
41–60	Perlu ditingkatkan. Pelajari kembali materi dan perhatikan ketentuan praktik.
1–40	Perlu banyak perbaikan. Fokus pada pemahaman dasar dan penyelesaian tugas praktik.
0	Belum ada capaian. Pastikan tugas praktik diselesaikan sesuai ketentuan.


62. Feedback Settings
Instruktur dapat mengubah:
- min score;
- max score;
- message.
Lokasi:
Mata Kuliah
→ Settings
→ Feedback Nilai
Validasi harus mencegah rentang overlap.
63. Rekap Nilai
Instruktur dapat export berdasarkan:
- mata kuliah;
- periode;
- kelas.
Data minimal:
NIM
Nama
Kelas
Periode
Kehadiran
Kualitas
Sikap
Kreativitas
Laporan
Nilai Akhir
Feedback
Status
Format MVP:
- CSV
- XLSX
64. Analytics
Analytics mata kuliah mencakup:
- total peserta;
- progress rata-rata;
- completion rate;
- submission rate;
- nilai rata-rata;
- nilai tertinggi;
- nilai terendah;
- Top 3;
- jumlah belum dinilai;
- jumlah nilai published;
- mahasiswa kehadiran <75%.
65. Daily Score Chart
Grafik perkembangan nilai berdasarkan hari.
Axis contoh:
Y = Nilai
X = Tanggal
Filter:
- periode;
- kelas;
- mahasiswa.
66. Search & Filtering
Instruktur harus dapat mencari berdasarkan:
- NIM;
- Nama;
- Kelas.
Filter utama:
- Mata Kuliah;
- Periode;
- Kelas;
- Status;
- Progress;
- Penilaian.
67. Status Badges
Gunakan badge konsisten.
Contoh:
🟢 Aktif
⚪ Akan Datang
✓ Selesai
🟡 Belum Dinilai
🔵 Sudah Dinilai
🟢 Dipublikasikan
🔴 Kehadiran Tidak Memenuhi
Warna final ditentukan design system.
68. Navigation Mahasiswa
Layout learning workspace desktop:
┌──────────────────────────────────────────────────────┐
│ Portal Praktik Poliwako          Pemesinan CNC      │
├──────────────┬───────────────────────────────────────┤
│              │                                       │
│ COURSE       │ UNIT 3                                │
│ OUTLINE      │ Proses Pemesinan                      │
│              │                                       │
│ ✓ Unit 1     │ Materi                                │
│ ✓ Unit 2     │                                       │
│ ● Unit 3     │ [Video]                               │
│ 🔒 Unit 4    │                                       │
│ 🔒 Unit 5    │ [Download PDF]                        │
│              │                                       │
│              │ Materi / Instruksi...                 │
│              │                                       │
│              │ [Previous] [Tandai Selesai & Next]   │
└──────────────┴───────────────────────────────────────┘
Referensi visual yang diberikan pengguna menjadi acuan pola course outline + content area, bukan untuk disalin identik.
69. Responsive Design
Instruktur terutama dioptimalkan untuk:
- laptop;
- desktop.
Mahasiswa harus nyaman di:
- smartphone;
- tablet;
- desktop.
Learning Workspace wajib responsive.
70. Design Direction
Karakter UI:
- clean;
- modern;
- akademik;
- sederhana;
- tidak terlalu banyak elemen dekoratif;
- informasi status mudah dipindai.
Nama di header:
Portal Praktik Poliwako

Tagline opsional:
Learning • Practice • Assessment

71. Technology Stack
Frontend
React + Vite
Disarankan:
React
Vite
TypeScript
React Router
TanStack Query
TypeScript sangat disarankan meskipun requirement awal hanya menyebut React + Vite.
72. Backend / Database
Supabase
Komponen:
Supabase PostgreSQL
Supabase Auth
Supabase Storage
Row Level Security
73. ORM
Gunakan:
Drizzle ORM
Untuk:
- schema;
- typed query;
- migrations;
- relationship.
Database inspection:
Drizzle Studio
74. Deployment
Frontend:
Vercel
Environment minimal:
Production
Preview
Development
Secrets tidak boleh disimpan di repository.
75. Recommended Application Architecture
React + Vite
      │
      ▼
Application Layer
      │
      ├── Auth
      ├── Course
      ├── Student
      ├── Practice
      ├── LMS
      ├── Assignment
      ├── Attendance
      ├── Assessment
      ├── Analytics
      └── Export
      │
      ▼
Supabase
      │
      ├── PostgreSQL
      ├── Auth
      └── Storage

Drizzle ORM
      │
      └── Schema + Migration + Studio
76. Suggested Frontend Structure
src/
│
├── app/
├── components/
├── features/
│   ├── auth/
│   ├── dashboard/
│   ├── students/
│   ├── courses/
│   ├── periods/
│   ├── learning/
│   ├── assignments/
│   ├── submissions/
│   ├── attendance/
│   ├── grading/
│   ├── analytics/
│   └── settings/
│
├── hooks/
├── lib/
├── routes/
├── services/
├── types/
└── utils/
Struktur feature-based lebih cocok daripada menaruh seluruh page/component dalam folder besar.
77. Database Architecture
Core relationship:
USER / INSTRUCTOR
│
├── STUDENTS
│
└── COURSES
    │
    ├── SUB CPMK
    ├── FEEDBACK RULES
    │
    └── PRACTICE PERIODS
        │
        ├── PARTICIPANTS
        ├── LEARNING UNITS
        │   ├── MATERIALS
        │   └── PROGRESS
        │
        ├── ASSIGNMENTS
        │   └── SUBMISSIONS
        │
        ├── ATTENDANCE
        ├── FINAL PROJECT
        ├── ASSESSMENTS
        │   └── ASSESSMENT DETAILS
        │
        └── REMEDIAL
78. Suggested Database Tables
Minimal:
profiles
students

courses
course_sub_cpmk
practice_periods
practice_participants

learning_units
learning_materials
unit_progress

assignments
submissions

attendance_records

rubrics
rubric_criteria

assessments
assessment_details

final_projects

remedial_assignments
remedial_submissions

feedback_rules
Tambahkan audit timestamps pada tabel penting:
created_at
updated_at
79. Core Relationship Rules
Instructor → Course
1 : many
Instructor → Master Student
1 : many
Course → Practice Period
1 : many
Practice Period → Participant
1 : many
Student → Practice Participant
1 : many
Practice Period → Learning Unit
1 : many
Learning Unit → Progress
1 : many
Practice Period → Assignment
1 : many
80. Security Requirements
Security merupakan requirement wajib, terutama karena mahasiswa tidak login.
Instruktur:
- Google OAuth;
- domain restriction;
- RLS;
- session expiry;
- protected routes.
Mahasiswa:
- tidak boleh dapat menebak URL storage;
- tidak boleh dapat membaca submission mahasiswa lain;
- tidak boleh mendapatkan akses database langsung yang terlalu luas.
81. Important Student Access Architecture
Pemilihan Nama + NIM bukan authentication kuat.
Karena sistem memang dirancang untuk penggunaan di lingkungan praktik kampus, model tersebut dapat digunakan pada MVP.
Namun setelah mahasiswa memilih identitas, aplikasi sebaiknya menghasilkan short-lived student practice session/token yang terikat pada:
student
course
practice_period
Bukan mempercayai student_id yang dikirim frontend pada setiap request.
Ini penting untuk mencegah manipulasi request sederhana.
82. RLS
Setiap data instruktur harus dibatasi berdasarkan:
auth.uid()
Contoh konseptual:
course.owner_id = auth.uid()
Jangan mengandalkan filter frontend:
WHERE instructor_id = ...
sebagai satu-satunya proteksi.
83. Storage Security
Bucket assignment sebaiknya private.
PDF preview menggunakan signed URL dengan masa berlaku terbatas.
Path dapat mengikuti:
instructor/
course/
period/
student/
assignment/
file.pdf
84. Validation
Validasi dilakukan pada:
Frontend
untuk UX.
Server/database
untuk security dan integrity.
Contoh:
- file PDF;
- deadline;
- period active;
- ownership;
- attendance;
- grade publication.
85. Performance Requirements
Target awal:
- dashboard initial load <3 detik pada koneksi normal;
- navigation terasa instan setelah cache;
- pagination untuk tabel besar;
- lazy loading PDF preview;
- lazy loading analytics;
- query indexes pada foreign key/filter utama.
86. Accessibility
Minimal:
- keyboard navigation;
- form labels;
- contrast yang cukup;
- focus state;
- error message berbasis teks;
- tidak mengandalkan warna saja untuk status.
87. Error Handling
Mahasiswa harus mendapatkan pesan yang jelas.
Contoh:
Anda belum terdaftar pada periode praktik ini. Silakan hubungi instruktur.

atau:
Periode pengumpulan telah berakhir. Materi masih dapat dipelajari, tetapi pengumpulan tugas telah ditutup.

88. Audit Trail
Disarankan mencatat event penting:
- course created;
- participant added;
- submission uploaded;
- unit completed;
- unit completion cancelled;
- project confirmed;
- assessment changed;
- attendance changed;
- grade published;
- remedial passed.
Tidak perlu membuat enterprise audit system pada MVP, tetapi event penting sebaiknya dapat dilacak.
89. Core Instructor User Flow
Google Login
      ↓
Dashboard
      ↓
Pilih/Buat Mata Kuliah
      ↓
Atur Tahun Ajaran + Semester
      ↓
Sub-CPMK
      ↓
Buat Periode
      ↓
Tanggal Mulai
      ↓
Auto +5 hari
      ↓
Bulk Insert NIM
      ↓
Learning Units
      ↓
Materi
      ↓
Tugas
      ↓
Final Project Link
      ↓
Publish
      ↓
Monitor Progress
      ↓
Attendance
      ↓
Grading
      ↓
Publish Grade
      ↓
Analytics
      ↓
Export
90. Core Student User Flow
Buka URL Mata Kuliah
       ↓
Pilih Nama + NIM
       ↓
Masuk Praktik
       ↓
Unit 1
       ↓
Tandai Selesai
       ↓
Unit 2 terbuka
       ↓
...
       ↓
Learning 100%
       ↓
Final Project
       ↓
Google Drive
       ↓
Konfirmasi
       ↓
Menunggu Penilaian
       ↓
Nilai Dipublikasikan
       ↓
Nilai + Feedback
91. Attendance Exception Flow
Praktik
   ↓
Attendance <75%
   ↓
Nilai dinilai
   ↓
Publication BLOCKED
   ↓
Wajib Tugas Tambahan
   ↓
Mahasiswa submit PDF
   ↓
Instruktur review
   ↓
Semua tugas LULUS?
   │
   ├── Tidak → tetap blocked
   │
   └── Ya
       ↓
Nilai otomatis published
92. MVP Priority
P0 — Wajib
- Google Login;
- domain restriction;
- instructor isolation;
- Master Mahasiswa;
- CSV import;
- mata kuliah;
- periode;
- 5-day calculation;
- bulk NIM;
- student portal;
- learning units;
- progressive locking;
- PDF material;
- YouTube;
- external links;
- PDF assignment;
- Google Drive final project;
- progress;
- attendance;
- OBE/Sub-CPMK;
- rubrik;
- grading;
- automatic final score;
- publication;
- feedback;
- remedial;
- dashboard KPI;
- export.
P1 — Penting
- Copy Course;
- Duplicate Period;
- analytics lanjutan;
- daily score chart;
- Top 3;
- advanced filters;
- autosave grading.
P2 — Future
- SIAKAD integration;
- student SSO;
- Google Drive API;
- notifications;
- AI feedback;
- plagiarism;
- mobile app.
93. Acceptance Criteria — Authentication
Given pengguna membuka login instruktur
When login menggunakan akun politekniksorowako.ac.id
Then pengguna dapat masuk.
Given pengguna menggunakan akun Gmail pribadi
When login
Then akses instruktur ditolak.
94. Acceptance Criteria — Course Isolation
Given Instruktur A dan Instruktur B memiliki akun berbeda
When Instruktur A membuka dashboard
Then hanya data milik A yang dapat diakses.
Mengubah URL/request tidak boleh memungkinkan A membaca data B.
95. Acceptance Criteria — Practice Period
Given tanggal mulai 2026-09-07
When periode dibuat
Then default tanggal selesai menjadi 2026-09-11.
Instruktur dapat mengubah tanggal selesai.
96. Acceptance Criteria — Bulk NIM
Given instruktur paste 20 NIM
When sistem memproses daftar
Then sistem menampilkan mahasiswa valid, duplikat, dan NIM tidak ditemukan sebelum penyimpanan.
97. Acceptance Criteria — Learning Unit
Given Unit 2 masih locked
When mahasiswa menandai Unit 1 selesai
Then Unit 2 menjadi available.
When Unit 1 dibatalkan
Then Unit 2 dan unit berikutnya kembali locked.
98. Acceptance Criteria — Progress
Given terdapat 10 learning unit
When mahasiswa menyelesaikan 7
Then progress = 70%.
When seluruh 10 selesai
Then progress = 100% dan Final Project tersedia.
99. Acceptance Criteria — Submission
Given tugas hanya menerima PDF
When mahasiswa mencoba mengunggah file selain PDF
Then submission ditolak.
100. Acceptance Criteria — Grading
Given semua rubrik sudah dinilai
When sistem menghitung skor
Then:
Quality × 70%
Attitude × 10%
Creativity × 5%
Report × 15%
menghasilkan nilai akhir secara otomatis.
101. Acceptance Criteria — Attendance
Given mahasiswa hadir 3 dari 5 hari
Then kehadiran = 60%.
And status = Tidak Memenuhi.
And nilai tidak dapat dipublikasikan normal.
102. Acceptance Criteria — Remedial
Given mahasiswa memiliki attendance <75%
And seluruh tugas tambahan telah berstatus Lulus
When tugas terakhir dinyatakan Lulus
Then nilai otomatis dipublikasikan.
103. Acceptance Criteria — Student Grade
Given nilai belum published
Then mahasiswa tidak melihat skor.
Given nilai sudah published
Then mahasiswa hanya melihat:
Nilai Akhir
Feedback
Detail rubrik tidak ditampilkan.
104. Acceptance Criteria — Period Expiry
Given periode telah berakhir
Then mahasiswa masih dapat melihat materi.
Namun aktivitas pengumpulan yang terikat periode harus ditutup.
105. Success Metrics
Setelah implementasi, keberhasilan produk dapat diukur dari:
- ≥90% peserta dapat mengakses praktik tanpa bantuan instruktur;
- ≥90% submission tercatat melalui portal;
- penurunan waktu rekap nilai;
- ≥95% nilai dihitung otomatis tanpa perhitungan manual;
- seluruh peserta dapat dilacak progresnya;
- seluruh kasus kehadiran <75% dapat teridentifikasi otomatis;
- tidak ada cross-account data exposure antar instruktur.
106. MVP Development Phases
Saya menyarankan development tidak dilakukan sekaligus.
Phase 1 — Foundation
Authentication, RLS, database, Master Mahasiswa, mata kuliah.
Phase 2 — Practice Management
Periode, peserta, bulk NIM, course URL.
Phase 3 — Learning Workspace
Unit, materi, YouTube, PDF, progressive locking, progress.
Phase 4 — Assignment
PDF submission, Final Project Google Drive.
Phase 5 — OBE & Grading
Sub-CPMK, rubrik, PDF preview, nilai otomatis.
Phase 6 — Attendance & Remedial
Kehadiran, 75% rule, tugas tambahan.
Phase 7 — Analytics
KPI, ranking, chart, export.
Phase 8 — Hardening
Security, RLS testing, responsive UI, performance, deployment.
107. Definition of Done MVP
Portal Praktik Poliwako MVP dianggap selesai apabila:
Instruktur dapat login menggunakan akun Politeknik Sorowako, membuat mata kuliah, mengelola master mahasiswa, membuat periode praktik, memasukkan peserta melalui NIM, membuat pembelajaran bertahap, memberikan materi dan tugas, memonitor progress dan kehadiran, menilai melalui rubrik OBE, memproses tugas tambahan, mempublikasikan nilai, melihat analytics, dan mengekspor rekap.
Pada sisi lain, mahasiswa dapat membuka URL mata kuliah tanpa akun, memilih identitas, mengikuti learning path, mengumpulkan tugas PDF, menyelesaikan project akhir melalui Google Drive, memantau progress, dan melihat nilai akhir beserta feedback setelah dipublikasikan.
108. Final Technical Baseline
PRODUCT
Portal Praktik Poliwako

FRONTEND
React
Vite
TypeScript

DEPLOYMENT
Vercel

DATABASE
PostgreSQL / Supabase

AUTH
Supabase Auth
Google OAuth
@politekniksorowako.ac.id only

STORAGE
Supabase Storage

ORM
Drizzle ORM

DATABASE TOOLING
Drizzle Studio

SECURITY
Supabase RLS

TIMEZONE
Asia/Makassar (WITA)

STUDENT AUTH
No account
Practice-scoped temporary session

INTERNAL SUBMISSION
PDF only

FINAL PROJECT
External Google Drive link

ASSESSMENT
OBE / Sub-CPMK + Rubric

RUBRIC SCALE
100 / 75 / 50 / 25 / 0

ASSESSMENT WEIGHTS
Kualitas       70%
Sikap          10%
Kreativitas     5%
Laporan        15%
Keputusan Produk
Dengan PRD ini, Portal Praktik Poliwako diposisikan bukan hanya sebagai tempat upload tugas, tetapi sebagai Practice Learning Management & Assessment System yang berpusat pada workflow instruktur.
Arsitektur paling penting yang perlu dipertahankan selama development adalah pemisahan Master Mahasiswa → Mata Kuliah → Periode Praktik → Peserta → Learning → Submission → Assessment. Dengan model tersebut, sistem tetap sederhana untuk mahasiswa tetapi cukup fleksibel bagi instruktur yang menangani banyak mata kuliah dan banyak periode praktik dalam satu semester.