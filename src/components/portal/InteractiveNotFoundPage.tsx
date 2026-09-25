import React from 'react';
import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  Home,
  Search,
  ShieldCheck
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface InteractiveNotFoundPageProps {
  invalidPath: string;
  onNavigate: (path: string) => void;
}

export const InteractiveNotFoundPage: React.FC<InteractiveNotFoundPageProps> = ({
  invalidPath,
  onNavigate
}) => {
  const { courses } = useApp();

  return (
    <div className="relative flex min-h-0 w-full flex-1 flex-col items-center justify-center overflow-y-auto bg-slate-50 px-4 py-8 text-slate-800 sm:px-6">
      <main className="my-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-10">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-800">
          <Search className="h-6 w-6" aria-hidden="true" />
        </div>
        <p className="mx-auto inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
          Rute tidak ditemukan
        </p>
        <h1 className="mt-4 text-6xl font-bold tracking-tight text-blue-800 sm:text-8xl">404</h1>
        <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Halaman tidak ditemukan</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
          Alamat <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-800">/{invalidPath}</code> tidak terdaftar di Portal Praktik Poliwako.
        </p>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => onNavigate('/mahasiswa')} className="ui-button ui-button-primary w-full">
            <GraduationCap className="h-4 w-4" aria-hidden="true" />
            Ke portal mahasiswa
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => onNavigate('/instruktur')} className="ui-button ui-button-secondary w-full">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Ke portal instruktur
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <button type="button" onClick={() => onNavigate('/')} className="ui-button ui-button-quiet mt-3 w-full">
          <Home className="h-4 w-4" aria-hidden="true" />
          Kembali ke pilihan portal
        </button>

        {courses.length > 0 && (
          <section className="mt-7 border-t border-slate-200 pt-5 text-left" aria-label="Mata kuliah tersedia">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold text-slate-700">
              <BookOpen className="h-4 w-4 text-blue-700" aria-hidden="true" />
              Mata kuliah yang tersedia
            </h3>
            <div className="flex flex-wrap gap-2">
              {courses.map(course => (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => onNavigate(`/${course.slug}`)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
                >
                  {course.name}<span className="ml-2 font-mono font-normal text-slate-500">/{course.slug}</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};
