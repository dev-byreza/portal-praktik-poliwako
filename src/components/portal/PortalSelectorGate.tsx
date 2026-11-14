// Portal role selector for students and instructors.
import React from 'react';
import { ArrowRight, GraduationCap, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { FooterBranding } from '../common/FooterBranding';

interface PortalSelectorGateProps {
  onSelectRole: (role: 'STUDENT' | 'INSTRUCTOR', path: string) => void;
}

export const PortalSelectorGate: React.FC<PortalSelectorGateProps> = ({ onSelectRole }) => {
  const { isInstructorLoggedIn } = useApp();

  return (
    <div className="portal-selector-gate relative flex w-full flex-1 flex-col justify-between text-slate-800">
      <main className="flex w-full flex-1 items-center justify-center px-4 py-8 sm:px-8 sm:py-12">
        <div className="w-full max-w-5xl">
          <header className="mb-6 flex flex-col items-center text-center sm:mb-10">
            <img src="/logo-poliwako.webp" alt="Logo Politeknik Sorowako" className="mb-3.5 h-14 w-14 object-contain sm:mb-4 sm:h-20 sm:w-20" />
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-800">Politeknik Sorowako</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-4xl">Portal Praktik Terpadu</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
              Pilih portal sesuai peran Anda untuk melanjutkan kegiatan pembelajaran praktik.
            </p>
          </header>

          <section aria-label="Pilih portal" className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-6">
            <a
              href="/mahasiswa"
              onClick={event => {
                if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                onSelectRole('STUDENT', '/mahasiswa');
              }}
              className="group flex min-h-52 sm:min-h-64 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 sm:p-7"
            >
              <div>
                <div className="mb-5 flex items-center justify-between gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-800">
                    <GraduationCap className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="text-xs font-semibold text-slate-500">Portal mahasiswa</span>
                </div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Materi dan tugas praktik</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Buka materi, pantau tenggat, kumpulkan tugas, dan tinjau umpan balik instruktur.
                </p>
              </div>
              <span className="ui-button ui-button-primary mt-6 w-full sm:w-fit">
                Lanjut sebagai mahasiswa <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </a>

            <a
              href="/instruktur"
              onClick={event => {
                if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                onSelectRole('INSTRUCTOR', '/instruktur');
              }}
              className="group flex min-h-52 sm:min-h-64 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 sm:p-7"
            >
              <div>
                <div className="mb-5 flex items-center justify-between gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-800">
                    <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="text-xs font-semibold text-slate-500">Portal instruktur</span>
                </div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Kelola pembelajaran</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Atur mata kuliah, presensi, penilaian, dan progres mahasiswa.
                </p>
              </div>
              <span className="ui-button ui-button-secondary mt-6 w-full sm:w-fit">
                {isInstructorLoggedIn ? 'Buka portal instruktur' : 'Masuk sebagai instruktur'}
                {!isInstructorLoggedIn && <LockKeyhole className="h-4 w-4" aria-hidden="true" />}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </a>
          </section>
        </div>
      </main>

      <footer className="shrink-0 border-t border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/80 px-4 py-2.5">
        <div className="mx-auto max-w-7xl">
          <FooterBranding theme="light" compact />
        </div>
      </footer>
    </div>
  );
};
